import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Alert, Badge, inputCls, btnPrimary, btnSecondary } from "@/components/ui";
import { concluirConferencia } from "@/lib/actions";

export default async function ConferenciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: vistoria } = await supabase
    .from("vistorias")
    .select(
      "*, agendamentos(placa, marca, modelo, ano, endereco, cidade), profiles(nome)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!vistoria) notFound();

  const [{ data: itens }, { data: registros }, { data: consulta }] = await Promise.all([
    supabase.from("checklist_itens").select("*").eq("ativo", true).order("ordem"),
    supabase.from("vistoria_itens").select("*").eq("vistoria_id", id),
    supabase
      .from("consultas_veiculares")
      .select("*")
      .eq("vistoria_id", id)
      .eq("status", "concluida")
      .maybeSingle(),
  ]);

  const ag = vistoria.agendamentos as unknown as {
    placa: string; marca: string; modelo: string; ano: string; endereco: string; cidade: string;
  };
  const registroPorItem = new Map((registros ?? []).map((r) => [r.checklist_item_id, r]));
  const resultado = (consulta?.resultado ?? null) as {
    chassi?: string; marca?: string; modelo?: string; situacao?: string; restricoes?: string[];
  } | null;

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

  const alertas: string[] = [];
  if (vistoria.chassi_fisico !== vistoria.chassi_documental)
    alertas.push(`Chassi físico (${vistoria.chassi_fisico}) difere do documental (${vistoria.chassi_documental})`);
  if (resultado?.chassi && vistoria.chassi_documental !== resultado.chassi)
    alertas.push(`Chassi documental difere da consulta (${resultado.chassi})`);
  if (vistoria.placa_confirmada && ag?.placa && vistoria.placa_confirmada !== ag.placa)
    alertas.push(`Placa confirmada em campo (${vistoria.placa_confirmada}) difere da agendada (${ag.placa})`);
  if (resultado?.restricoes?.length)
    alertas.push(`Consulta retornou restrições: ${resultado.restricoes.join(", ")}`);
  const itensDanificados = (itens ?? []).filter(
    (it) => registroPorItem.get(it.id)?.condicao === "danificado"
  );
  if (itensDanificados.length)
    alertas.push(`${itensDanificados.length} item(ns) marcados como danificados — confira as fotos`);

  const jaConcluida = vistoria.status !== "em_conferencia";

  return (
    <div className="max-w-3xl">
      <PageTitle
        title={`Conferência — ${ag?.placa}`}
        subtitle={`${[ag?.marca, ag?.modelo, ag?.ano].filter(Boolean).join(" ")} · vistoriador: ${(vistoria.profiles as unknown as { nome: string })?.nome ?? "—"}`}
        action={<Badge status={vistoria.status} />}
      />

      {alertas.length > 0 ? (
        <Alert tipo="erro">
          <b>Alertas automáticos de inconsistência:</b>
          <ul className="list-disc ml-5 mt-1">
            {alertas.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Alert>
      ) : (
        <Alert tipo="ok">Nenhuma inconsistência automática detectada.</Alert>
      )}

      <Card className="p-5 mb-5">
        <h2 className="font-semibold mb-3">Conferência de numerações</h2>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
            <div className="text-xs text-zinc-500 mb-1">Chassi físico (campo)</div>
            <div className="font-mono font-semibold">{vistoria.chassi_fisico ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
            <div className="text-xs text-zinc-500 mb-1">Chassi documental (CRLV)</div>
            <div className="font-mono font-semibold">{vistoria.chassi_documental ?? "—"}</div>
          </div>
          <div className="rounded-lg bg-zinc-50 border border-zinc-200 p-3">
            <div className="text-xs text-zinc-500 mb-1">Chassi na consulta</div>
            <div className="font-mono font-semibold">{resultado?.chassi ?? "—"}</div>
          </div>
        </div>
        {resultado && (
          <div className="text-sm text-zinc-600 mt-3">
            Consulta: {resultado.marca} {resultado.modelo} · situação <b>{resultado.situacao}</b>
          </div>
        )}
      </Card>

      <Card className="p-5 mb-5">
        <h2 className="font-semibold mb-3">Fotos × marcações do vistoriador</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(itens ?? []).map((it) => {
            const r = registroPorItem.get(it.id);
            const url = r?.foto_path ? fotoUrls.get(r.foto_path) : null;
            return (
              <div key={it.id} className="rounded-lg border border-zinc-200 overflow-hidden">
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt={it.nome} className="h-28 w-full object-cover" />
                ) : (
                  <div className="h-28 w-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">
                    sem foto
                  </div>
                )}
                <div className="p-2">
                  <div className="text-xs font-medium truncate">{it.nome}</div>
                  <div
                    className={`text-[11px] ${
                      r?.condicao === "danificado"
                        ? "text-red-600 font-semibold"
                        : "text-zinc-500"
                    }`}
                  >
                    {r?.condicao ?? "não marcado"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {!jaConcluida && (
        <Card className="p-5">
          <h2 className="font-semibold mb-3">Decisão</h2>
          <form action={concluirConferencia} className="space-y-3">
            <input type="hidden" name="vistoria_id" value={vistoria.id} />
            <textarea
              name="observacoes"
              rows={2}
              placeholder="Observações da conferência (opcional)"
              className={inputCls}
            />
            <div className="flex gap-3">
              <button
                name="decisao"
                value="aprovar"
                className={`${btnPrimary} flex-1 bg-emerald-600 hover:bg-emerald-700`}
              >
                Aprovar — gerar entrega (Fase 8)
              </button>
              <button name="decisao" value="reprovar" className={`${btnSecondary} flex-1 text-red-600 border-red-300`}>
                Devolver ao vistoriador
              </button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
