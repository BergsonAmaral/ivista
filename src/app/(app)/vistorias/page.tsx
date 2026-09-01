import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Badge } from "@/components/ui";

export default async function VistoriasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  let query = supabase
    .from("vistorias")
    .select(
      "id, status, created_at, coleta_confirmada_em, agendamentos(placa, marca, modelo, endereco, cidade, data_agendada), profiles(nome), consultas_veiculares(status)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  // vistoriador vê só as suas
  if (profile?.role === "vistoriador") {
    query = query.eq("vistoriador_id", user!.id);
  }
  const { data: vistorias } = await query;

  return (
    <div>
      <PageTitle
        title="Fases 3–6 — Vistorias"
        subtitle="Fluxo guiado passo a passo: coleta → consulta → fotos → dados → envio"
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {(vistorias ?? []).map((v) => {
          const ag = v.agendamentos as unknown as {
            placa: string; marca: string; modelo: string; endereco: string; cidade: string; data_agendada: string;
          } | null;
          const consultas = (v.consultas_veiculares ?? []) as { status: string }[];
          const consultaStatus = consultas.find((c) => c.status === "concluida")
            ? "concluida"
            : consultas[0]?.status;
          return (
            <Link key={v.id} href={`/vistorias/${v.id}`}>
              <Card className="p-4 hover:border-zinc-400 transition-colors h-full">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-semibold">{ag?.placa ?? "—"}</span>
                  <Badge status={v.status} />
                </div>
                <div className="text-sm text-zinc-600">
                  {[ag?.marca, ag?.modelo].filter(Boolean).join(" ")}
                </div>
                <div className="text-xs text-zinc-500 truncate">
                  {ag?.endereco}
                  {ag?.cidade ? `, ${ag.cidade}` : ""}
                </div>
                <div className="flex items-center gap-2 mt-3 text-xs text-zinc-400">
                  <span>
                    {(v.profiles as unknown as { nome: string })?.nome ?? "sem vistoriador"}
                  </span>
                  {consultaStatus && (
                    <span className="ml-auto">
                      consulta: <Badge status={consultaStatus} />
                    </span>
                  )}
                </div>
              </Card>
            </Link>
          );
        })}
        {!vistorias?.length && (
          <Card className="p-8 text-center text-zinc-400 text-sm sm:col-span-2 lg:col-span-3">
            Nenhuma vistoria. Elas são criadas automaticamente quando um agendamento é roteirizado (Fase 2).
          </Card>
        )}
      </div>
    </div>
  );
}
