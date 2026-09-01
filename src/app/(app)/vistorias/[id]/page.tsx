import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Alert, Badge, inputCls, btnPrimary } from "@/components/ui";
import { Stepper } from "@/components/Stepper";
import { ConsultaPanel } from "@/components/ConsultaPanel";
import { ItemChecklistForm } from "@/components/ItemChecklistForm";
import { confirmarColeta, salvarDadosVistoria, enviarVistoria } from "@/lib/actions";

const STEPS = ["Coleta", "Fotos & condições", "Dados do veículo", "Envio"];

export default async function VistoriaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { erro, ok } = await searchParams;
  const supabase = await createClient();

  const { data: vistoria } = await supabase
    .from("vistorias")
    .select("*, agendamentos(placa, marca, modelo, ano, endereco, cidade, contato_nome, contato_telefone, observacoes)")
    .eq("id", id)
    .maybeSingle();
  if (!vistoria) notFound();

  const ag = vistoria.agendamentos as unknown as {
    placa: string; marca: string; modelo: string; ano: string; endereco: string;
    cidade: string; contato_nome: string; contato_telefone: string; observacoes: string;
  };

  const [{ data: itens }, { data: registros }, { data: consulta }] = await Promise.all([
    supabase.from("checklist_itens").select("*").eq("ativo", true).order("ordem"),
    supabase.from("vistoria_itens").select("*").eq("vistoria_id", id),
    supabase
      .from("consultas_veiculares")
      .select("*")
      .eq("vistoria_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const registroPorItem = new Map((registros ?? []).map((r) => [r.checklist_item_id, r]));

  // URLs assinadas das fotos
  const paths = (registros ?? []).map((r) => r.foto_path).filter(Boolean) as string[];
  const fotoUrls = new Map<string, string>();
  if (paths.length) {
    const { data: signed } = await supabase.storage
      .from("vistoria-fotos")
      .createSignedUrls(paths, 3600);
    signed?.forEach((s, i) => {
      if (s.signedUrl) fotoUrls.set(paths[i], s.signedUrl);
    });
  }

  // ===== progresso =====
  const coletaOk = !!vistoria.coleta_confirmada_em;
  const itensPendentes = (itens ?? []).filter((it) => {
    const r = registroPorItem.get(it.id);
    return !r?.condicao || (it.foto_obrigatoria && !r?.foto_path);
  });
  const fotosOk = coletaOk && itensPendentes.length === 0;
  const dadosOk =
    (vistoria.chassi_fisico?.trim().length ?? 0) >= 17 &&
    (vistoria.chassi_documental?.trim().length ?? 0) >= 17 &&
    (vistoria.placa_confirmada?.trim().length ?? 0) >= 7;
  const consultaOk = consulta?.status === "concluida";
  const enviada = ["enviada", "em_conferencia", "aprovada", "entregue"].includes(vistoria.status);

  const step = enviada ? 4 : !coletaOk ? 0 : !fotosOk ? 1 : !dadosOk ? 2 : 3;
  const bloqueado = enviada;

  const pendencias: string[] = [];
  if (!coletaOk) pendencias.push("Confirmar checklist de coleta");
  if (itensPendentes.length)
    pendencias.push(`${itensPendentes.length} item(ns) do checklist sem condição ou foto obrigatória`);
  if ((vistoria.chassi_fisico?.trim().length ?? 0) < 17) pendencias.push("Chassi físico (17 caracteres)");
  if ((vistoria.chassi_documental?.trim().length ?? 0) < 17) pendencias.push("Chassi documental (17 caracteres)");
  if ((vistoria.placa_confirmada?.trim().length ?? 0) < 7) pendencias.push("Placa confirmada");
  if (!consultaOk) pendencias.push("Consulta veicular concluída");

  return (
    <div className="max-w-2xl">
      <PageTitle
        title={`Vistoria — ${ag?.placa ?? ""}`}
        subtitle={`${[ag?.marca, ag?.modelo, ag?.ano].filter(Boolean).join(" ")} · ${ag?.endereco ?? ""}${ag?.cidade ? ", " + ag.cidade : ""}`}
        action={<Badge status={vistoria.status} />}
      />

      {erro && <Alert tipo="erro">{erro}</Alert>}
      {ok === "enviada" && (
        <Alert tipo="ok">Laudo enviado com sucesso! Ele entrou na fila de conferência (Fase 7).</Alert>
      )}

      <Card className="px-3 mb-5">
        <Stepper steps={STEPS} current={step} />
      </Card>

      {/* Fase 4 — consulta sempre visível após a coleta */}
      {coletaOk && (
        <div className="mb-5">
          <ConsultaPanel consulta={consulta ?? null} />
        </div>
      )}

      {/* ===== ETAPA 1: COLETA (Fase 3) ===== */}
      {!enviada && (
        <Card className={`p-5 mb-5 ${step !== 0 ? "opacity-100" : ""}`}>
          <h2 className="font-semibold mb-1">
            Etapa 1 — Chegada e coleta {coletaOk && <span className="text-emerald-600">✓</span>}
          </h2>
          {!coletaOk ? (
            <>
              <p className="text-sm text-zinc-500 mb-3">
                Confirme os itens recebidos. Ao confirmar, a <b>consulta veicular é disparada
                automaticamente</b> e você já pode começar as fotos sem esperar o resultado.
              </p>
              {ag?.contato_nome && (
                <p className="text-sm mb-3">
                  Contato no local: <b>{ag.contato_nome}</b>
                  {ag.contato_telefone ? ` · ${ag.contato_telefone}` : ""}
                </p>
              )}
              <form action={confirmarColeta} className="space-y-2">
                <input type="hidden" name="vistoria_id" value={vistoria.id} />
                {[
                  { name: "coleta_chaves", label: "Recebi as chaves do veículo" },
                  { name: "coleta_documento", label: "Recebi o documento (CRLV)" },
                  { name: "coleta_foto_inicial", label: "Fiz a foto inicial do veículo no local" },
                ].map((c) => (
                  <label key={c.name} className="flex items-center gap-2 text-sm p-2 rounded-lg border border-zinc-200 bg-zinc-50">
                    <input type="checkbox" name={c.name} className="h-4 w-4" required />
                    {c.label}
                  </label>
                ))}
                <button className={`${btnPrimary} w-full`}>
                  Confirmar coleta e disparar consulta
                </button>
              </form>
            </>
          ) : (
            <p className="text-sm text-zinc-500">
              Coleta confirmada em{" "}
              {new Date(vistoria.coleta_confirmada_em).toLocaleString("pt-BR")}.
            </p>
          )}
        </Card>
      )}

      {/* ===== ETAPA 2: FOTOS & CONDIÇÕES (Fase 5) ===== */}
      {coletaOk && (
        <Card className="p-5 mb-5">
          <h2 className="font-semibold mb-1">
            Etapa 2 — Fotos e condições {fotosOk && <span className="text-emerald-600">✓</span>}
          </h2>
          <p className="text-sm text-zinc-500 mb-3">
            {itensPendentes.length
              ? `${(itens?.length ?? 0) - itensPendentes.length} de ${itens?.length} itens completos.`
              : "Todos os itens completos."}{" "}
            Cada item precisa de condição marcada{" "}
            {`e foto quando obrigatória — sem isso o envio é bloqueado.`}
          </p>
          <div className="space-y-3">
            {(itens ?? []).map((it) => {
              const r = registroPorItem.get(it.id) ?? null;
              return (
                <ItemChecklistForm
                  key={it.id}
                  vistoriaId={vistoria.id}
                  item={it}
                  registro={r}
                  fotoUrl={r?.foto_path ? (fotoUrls.get(r.foto_path) ?? null) : null}
                  bloqueado={bloqueado}
                />
              );
            })}
          </div>
        </Card>
      )}

      {/* ===== ETAPA 3: DADOS DO VEÍCULO (Fase 5/6) ===== */}
      {coletaOk && (
        <Card className="p-5 mb-5">
          <h2 className="font-semibold mb-1">
            Etapa 3 — Dados fundamentais {dadosOk && <span className="text-emerald-600">✓</span>}
          </h2>
          <p className="text-sm text-zinc-500 mb-3">
            Campos obrigatórios para o envio (hard-block). Compare o chassi físico gravado no
            veículo com o do documento.
          </p>
          <form action={salvarDadosVistoria} className="space-y-3">
            <input type="hidden" name="vistoria_id" value={vistoria.id} />
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Chassi físico (no veículo) *</span>
                <input
                  name="chassi_fisico"
                  defaultValue={vistoria.chassi_fisico ?? ""}
                  minLength={17}
                  maxLength={17}
                  disabled={bloqueado}
                  className={`${inputCls} font-mono uppercase`}
                />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Chassi documental (CRLV) *</span>
                <input
                  name="chassi_documental"
                  defaultValue={vistoria.chassi_documental ?? ""}
                  minLength={17}
                  maxLength={17}
                  disabled={bloqueado}
                  className={`${inputCls} font-mono uppercase`}
                />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Placa confirmada *</span>
                <input
                  name="placa_confirmada"
                  defaultValue={vistoria.placa_confirmada ?? ag?.placa ?? ""}
                  maxLength={7}
                  disabled={bloqueado}
                  className={`${inputCls} font-mono uppercase`}
                />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Quilometragem</span>
                <input name="km" defaultValue={vistoria.km ?? ""} disabled={bloqueado} className={inputCls} />
              </label>
            </div>
            {vistoria.chassi_fisico &&
              vistoria.chassi_documental &&
              vistoria.chassi_fisico !== vistoria.chassi_documental && (
                <Alert tipo="erro">
                  ⚠ Chassi físico difere do documental — verifique antes de enviar. A divergência
                  será destacada na conferência.
                </Alert>
              )}
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Observações</span>
              <textarea
                name="observacoes"
                rows={2}
                defaultValue={vistoria.observacoes ?? ""}
                disabled={bloqueado}
                className={inputCls}
              />
            </label>
            {!bloqueado && <button className={btnPrimary}>Salvar dados</button>}
          </form>
        </Card>
      )}

      {/* ===== ETAPA 4: ENVIO (Fase 6 — hard-block) ===== */}
      {coletaOk && !enviada && (
        <Card className="p-5 mb-5">
          <h2 className="font-semibold mb-1">Etapa 4 — Envio do laudo</h2>
          {pendencias.length > 0 ? (
            <>
              <p className="text-sm text-zinc-500 mb-2">
                O envio está <b>bloqueado</b> até resolver as pendências abaixo (trava de
                integridade — Fase 6):
              </p>
              <ul className="space-y-1 mb-3">
                {pendencias.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-sm text-red-600">
                    <span>✗</span> {p}
                  </li>
                ))}
              </ul>
              <button disabled className={`${btnPrimary} w-full`}>
                Enviar laudo (bloqueado)
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-emerald-700 mb-3">
                ✓ Todos os requisitos cumpridos. O laudo será enviado para a conferência (Fase 7).
              </p>
              <form action={enviarVistoria.bind(null, vistoria.id)}>
                <button className={`${btnPrimary} w-full bg-emerald-600 hover:bg-emerald-700`}>
                  Enviar laudo para conferência
                </button>
              </form>
            </>
          )}
        </Card>
      )}

      {enviada && (
        <Alert tipo="info">
          Laudo enviado{vistoria.enviada_em ? ` em ${new Date(vistoria.enviada_em).toLocaleString("pt-BR")}` : ""}.
          Edição bloqueada — acompanhe o andamento na Conferência e Entregas.
        </Alert>
      )}
    </div>
  );
}
