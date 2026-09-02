import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Badge } from "@/components/ui";

export default async function ConferenciaPage() {
  const supabase = await createClient();
  const { data: vistorias } = await supabase
    .from("vistorias")
    .select(
      "id, status, enviada_em, chassi_fisico, chassi_documental, agendamentos(placa, marca, modelo), profiles(nome), consultas_veiculares(status, resultado)"
    )
    .in("status", ["em_conferencia", "aprovada"])
    .order("enviada_em", { ascending: true });

  return (
    <div>
      <PageTitle
        title="Conferência de laudos"
        subtitle="Auditoria assistida: divergências entre chassi físico, documental e consulta são destacadas automaticamente"
      />
      <div className="space-y-3">
        {(vistorias ?? []).map((v) => {
          const ag = v.agendamentos as unknown as { placa: string; marca: string; modelo: string } | null;
          const consulta = ((v.consultas_veiculares ?? []) as { status: string; resultado: { chassi?: string } | null }[])
            .find((c) => c.status === "concluida");
          const chassiConsulta = consulta?.resultado?.chassi;
          const divergencias: string[] = [];
          if (v.chassi_fisico !== v.chassi_documental)
            divergencias.push("chassi físico ≠ documental");
          if (chassiConsulta && v.chassi_documental !== chassiConsulta)
            divergencias.push("chassi documental ≠ consulta");
          return (
            <Link key={v.id} href={`/conferencia/${v.id}`} className="block">
              <Card className="p-4 hover:border-zinc-400 transition-colors">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono font-semibold">{ag?.placa}</span>
                  <span className="text-sm text-zinc-500">
                    {[ag?.marca, ag?.modelo].filter(Boolean).join(" ")}
                  </span>
                  <Badge status={v.status} />
                  {divergencias.length > 0 ? (
                    <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-0.5">
                      ⚠ {divergencias.join(" · ")}
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-600">sem divergências automáticas</span>
                  )}
                  <span className="ml-auto text-xs text-zinc-400">
                    {(v.profiles as unknown as { nome: string })?.nome}
                    {v.enviada_em ? ` · enviado ${new Date(v.enviada_em).toLocaleString("pt-BR")}` : ""}
                  </span>
                </div>
              </Card>
            </Link>
          );
        })}
        {!vistorias?.length && (
          <Card className="p-8 text-center text-zinc-400 text-sm">
            Nenhum laudo aguardando conferência.
          </Card>
        )}
      </div>
    </div>
  );
}
