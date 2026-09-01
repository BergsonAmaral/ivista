import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle } from "@/components/ui";

const FASES = [
  { n: 1, nome: "Agendamento", desc: "Agenda unificada", href: "/agendamentos" },
  { n: 2, nome: "Roteirização", desc: "Rotas do dia", href: "/rotas" },
  { n: 3, nome: "Coleta", desc: "Checklist de chegada", href: "/vistorias" },
  { n: 4, nome: "Consulta", desc: "Fila automática c/ retry", href: "/vistorias" },
  { n: 5, nome: "Vistoria", desc: "Fotos + condições", href: "/vistorias" },
  { n: 6, nome: "Envio", desc: "Trava de campos", href: "/vistorias" },
  { n: 7, nome: "Conferência", desc: "Auditoria assistida", href: "/conferencia" },
  { n: 8, nome: "Entrega", desc: "Link seguro ao cliente", href: "/entregas" },
];

export default async function Dashboard() {
  const supabase = await createClient();
  const hoje = new Date().toISOString().slice(0, 10);

  const [agendamentos, vistoriasAtivas, conferenciasPend, entregasPend, consultasFalha] =
    await Promise.all([
      supabase
        .from("agendamentos")
        .select("id", { count: "exact", head: true })
        .in("status", ["solicitado", "confirmado"]),
      supabase
        .from("vistorias")
        .select("id", { count: "exact", head: true })
        .in("status", ["aguardando", "coleta", "em_vistoria"]),
      supabase
        .from("vistorias")
        .select("id", { count: "exact", head: true })
        .eq("status", "em_conferencia"),
      supabase
        .from("entregas")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      supabase
        .from("consultas_veiculares")
        .select("id", { count: "exact", head: true })
        .eq("status", "falha"),
    ]);

  const { count: rotasHoje } = await supabase
    .from("rotas")
    .select("id", { count: "exact", head: true })
    .eq("data", hoje);

  const cards = [
    { label: "Agendamentos a roteirizar", valor: agendamentos.count ?? 0, href: "/agendamentos" },
    { label: "Rotas hoje", valor: rotasHoje ?? 0, href: "/rotas" },
    { label: "Vistorias em campo", valor: vistoriasAtivas.count ?? 0, href: "/vistorias" },
    { label: "Aguardando conferência", valor: conferenciasPend.count ?? 0, href: "/conferencia" },
    { label: "Entregas pendentes", valor: entregasPend.count ?? 0, href: "/entregas" },
    { label: "Consultas com falha", valor: consultasFalha.count ?? 0, href: "/vistorias", alerta: true },
  ];

  return (
    <div>
      <PageTitle
        title="Painel operacional"
        subtitle="Fluxo completo em 8 fases — do agendamento à entrega do laudo"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-4 hover:border-zinc-400 transition-colors h-full">
              <div
                className={`text-2xl font-bold ${c.alerta && c.valor > 0 ? "text-red-600" : ""}`}
              >
                {c.valor}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mb-3">
        As 8 fases do fluxo
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FASES.map((f) => (
          <Link key={f.n} href={f.href}>
            <Card className="p-4 hover:border-zinc-400 transition-colors h-full">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white text-sm font-bold">
                  {f.n}
                </span>
                <div>
                  <div className="font-medium text-sm">{f.nome}</div>
                  <div className="text-xs text-zinc-500">{f.desc}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
