import { createClient } from "@/lib/supabase/server";
import { atribuirParada } from "@/lib/actions";
import { Card, PageTitle, Alert, inputCls, btnPrimary } from "@/components/ui";

export default async function RotasPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; data?: string }>;
}) {
  const { erro, data: dataParam } = await searchParams;
  const supabase = await createClient();
  const dataSel = dataParam ?? new Date().toISOString().slice(0, 10);

  const [{ data: pendentes }, { data: vistoriadores }, { data: rotas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, placa, modelo, marca, endereco, cidade, complexidade, data_agendada, janela_inicio")
      .in("status", ["solicitado", "confirmado"])
      .order("data_agendada", { ascending: true, nullsFirst: false }),
    supabase.from("profiles").select("id, nome").eq("role", "vistoriador").eq("ativo", true),
    supabase
      .from("rotas")
      .select(
        "id, data, profiles(nome), rota_paradas(id, ordem, tempo_estimado_min, agendamentos(placa, endereco, complexidade))"
      )
      .eq("data", dataSel),
  ]);

  return (
    <div>
      <PageTitle
        title="Fase 2 — Roteirização"
        subtitle="Atribua agendamentos a vistoriadores. O tempo estimado considera a complexidade do veículo."
      />
      {erro && <Alert tipo="erro">{erro}</Alert>}

      <form className="mb-4 flex items-center gap-2">
        <label className="text-sm text-zinc-500">Rotas do dia:</label>
        <input type="date" name="data" defaultValue={dataSel} className={`${inputCls} w-auto`} />
        <button className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm hover:bg-zinc-50">
          Ver
        </button>
      </form>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            A roteirizar ({pendentes?.length ?? 0})
          </h2>
          <div className="space-y-3">
            {(pendentes ?? []).map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="font-mono font-semibold">{a.placa}</span>{" "}
                    <span className="text-sm text-zinc-500">
                      {[a.marca, a.modelo].filter(Boolean).join(" ")}
                    </span>
                    <div className="text-sm text-zinc-500">
                      {a.endereco}
                      {a.cidade ? `, ${a.cidade}` : ""}
                    </div>
                    <div className="text-xs text-zinc-400 mt-1">
                      {a.data_agendada
                        ? new Date(a.data_agendada + "T12:00:00").toLocaleDateString("pt-BR")
                        : "sem data"}{" "}
                      · complexidade {a.complexidade}
                    </div>
                  </div>
                </div>
                <form action={atribuirParada} className="mt-3 flex flex-wrap items-center gap-2">
                  <input type="hidden" name="agendamento_id" value={a.id} />
                  <select name="vistoriador_id" required className={`${inputCls} w-auto flex-1 min-w-[160px]`}>
                    <option value="">Escolher vistoriador…</option>
                    {(vistoriadores ?? []).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.nome}
                      </option>
                    ))}
                  </select>
                  <input
                    type="date"
                    name="data"
                    required
                    defaultValue={a.data_agendada ?? dataSel}
                    className={`${inputCls} w-auto`}
                  />
                  <button className={btnPrimary}>Atribuir</button>
                </form>
              </Card>
            ))}
            {!pendentes?.length && (
              <Card className="p-8 text-center text-zinc-400 text-sm">
                Nada a roteirizar. Novos agendamentos aparecem aqui.
              </Card>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
            Rotas de {new Date(dataSel + "T12:00:00").toLocaleDateString("pt-BR")}
          </h2>
          <div className="space-y-3">
            {(rotas ?? []).map((r) => {
              const paradas = (r.rota_paradas ?? []).sort((a, b) => a.ordem - b.ordem);
              const total = paradas.reduce((s, p) => s + p.tempo_estimado_min, 0);
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">
                      {(r.profiles as unknown as { nome: string })?.nome}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {paradas.length} parada(s) · ~{Math.floor(total / 60)}h{total % 60 ? ` ${total % 60}min` : ""} de vistoria
                    </span>
                  </div>
                  <ol className="space-y-1.5">
                    {paradas.map((p) => {
                      const pag = p.agendamentos as unknown as {
                        placa: string; endereco: string; complexidade: string;
                      } | null;
                      return (
                      <li key={p.id} className="flex items-center gap-2 text-sm">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-[11px] font-bold">
                          {p.ordem}
                        </span>
                        <span className="font-mono">{pag?.placa}</span>
                        <span className="text-zinc-500 truncate">{pag?.endereco}</span>
                        <span className="ml-auto text-xs text-zinc-400 whitespace-nowrap">
                          ~{p.tempo_estimado_min}min
                        </span>
                      </li>
                      );
                    })}
                  </ol>
                </Card>
              );
            })}
            {!rotas?.length && (
              <Card className="p-8 text-center text-zinc-400 text-sm">
                Nenhuma rota para esta data ainda.
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
