import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Badge } from "@/components/ui";

const FASES = [
  { n: 1, nome: "Agendamento", desc: "Agenda unificada", href: "/agendamentos", cor: "from-sky-500 to-blue-600" },
  { n: 2, nome: "Roteirização", desc: "Rotas do dia", href: "/rotas", cor: "from-indigo-500 to-violet-600" },
  { n: 3, nome: "Coleta", desc: "Checklist de chegada", href: "/vistorias", cor: "from-cyan-500 to-teal-600" },
  { n: 4, nome: "Consulta", desc: "Fila automática c/ retry", href: "/vistorias", cor: "from-amber-500 to-orange-600" },
  { n: 5, nome: "Vistoria", desc: "Fotos + condições", href: "/vistorias", cor: "from-fuchsia-500 to-pink-600" },
  { n: 6, nome: "Envio", desc: "Trava de campos", href: "/vistorias", cor: "from-rose-500 to-red-600" },
  { n: 7, nome: "Conferência", desc: "Auditoria assistida", href: "/conferencia", cor: "from-violet-500 to-purple-600" },
  { n: 8, nome: "Entrega", desc: "Link seguro ao cliente", href: "/entregas", cor: "from-emerald-500 to-green-600" },
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

  // Fila de trabalho: o que está parado esperando ação humana
  const [{ data: filaRoteirizar }, { data: filaConferir }, { data: filaEntregar }] =
    await Promise.all([
      supabase
        .from("agendamentos")
        .select("id, placa, data_agendada, endereco")
        .in("status", ["solicitado", "confirmado"])
        .order("data_agendada", { ascending: true, nullsFirst: false })
        .limit(5),
      supabase
        .from("vistorias")
        .select("id, enviada_em, agendamentos(placa)")
        .eq("status", "em_conferencia")
        .order("enviada_em")
        .limit(5),
      supabase
        .from("entregas")
        .select("id, created_at, vistorias(agendamentos(placa)), clientes(nome)")
        .eq("status", "pendente")
        .order("created_at")
        .limit(5),
    ]);

  const acoes = [
    ...(filaRoteirizar ?? []).map((a) => ({
      key: `r-${a.id}`,
      placa: a.placa as string | null,
      texto: `Atribuir vistoriador — ${a.endereco}`,
      quando: a.data_agendada
        ? new Date(a.data_agendada + "T12:00:00").toLocaleDateString("pt-BR")
        : "sem data",
      href: "/rotas",
      botao: "Roteirizar",
      status: "confirmado",
    })),
    ...(filaConferir ?? []).map((v) => ({
      key: `c-${v.id}`,
      placa: (v.agendamentos as unknown as { placa: string })?.placa ?? null,
      texto: "Laudo aguardando conferência",
      quando: v.enviada_em ? new Date(v.enviada_em).toLocaleString("pt-BR") : "",
      href: `/conferencia/${v.id}`,
      botao: "Conferir",
      status: "em_conferencia",
    })),
    ...(filaEntregar ?? []).map((e) => ({
      key: `e-${e.id}`,
      placa:
        ((e.vistorias as unknown as { agendamentos: { placa: string } })?.agendamentos
          ?.placa as string) ?? null,
      texto: `Enviar laudo ao cliente ${
        (e.clientes as unknown as { nome: string })?.nome ?? ""
      }`,
      quando: new Date(e.created_at).toLocaleString("pt-BR"),
      href: "/entregas",
      botao: "Enviar",
      status: "pendente",
    })),
  ];

  const cards = [
    { label: "A roteirizar", valor: agendamentos.count ?? 0, href: "/agendamentos", cor: "text-sky-600" },
    { label: "Rotas hoje", valor: rotasHoje ?? 0, href: "/rotas", cor: "text-indigo-600" },
    { label: "Em campo", valor: vistoriasAtivas.count ?? 0, href: "/vistorias", cor: "text-amber-600" },
    { label: "Em conferência", valor: conferenciasPend.count ?? 0, href: "/conferencia", cor: "text-violet-600" },
    { label: "Entregas pendentes", valor: entregasPend.count ?? 0, href: "/entregas", cor: "text-emerald-600" },
    { label: "Consultas com falha", valor: consultasFalha.count ?? 0, href: "/vistorias", cor: "text-red-600", alerta: true },
  ];

  return (
    <div>
      <PageTitle
        title="Painel operacional"
        subtitle="Fluxo completo em 8 fases — do agendamento à entrega do laudo, sem gargalos"
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <Card className="p-4 hover:-translate-y-0.5 hover:shadow-md transition-all h-full">
              <div
                className={`text-3xl font-bold tabular-nums ${
                  c.alerta && c.valor === 0 ? "text-slate-300" : c.cor
                }`}
              >
                {c.valor}
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">{c.label}</div>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
        Precisa de você agora
      </h2>
      <Card className="mb-10 divide-y divide-zinc-100">
        {acoes.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-400">
            Tudo em dia — nenhuma ação pendente. 🎉
          </div>
        )}
        {acoes.map((a) => (
          <div key={a.key} className="flex items-center gap-3 p-4">
            <Badge status={a.status} />
            <div className="min-w-0 flex-1">
              <span className="font-mono font-semibold text-sm">{a.placa ?? "—"}</span>
              <span className="text-sm text-slate-600"> · {a.texto}</span>
              <div className="text-xs text-slate-400">{a.quando}</div>
            </div>
            <Link
              href={a.href}
              className="shrink-0 rounded-lg bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-indigo-500 transition-colors"
            >
              {a.botao} →
            </Link>
          </div>
        ))}
      </Card>

      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
        As 8 fases do fluxo
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FASES.map((f) => (
          <Link key={f.n} href={f.href}>
            <Card className="p-4 hover:-translate-y-0.5 hover:shadow-md transition-all h-full">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.cor} text-white text-sm font-black shadow-sm`}
                >
                  {f.n}
                </span>
                <div>
                  <div className="font-semibold text-sm text-slate-900">{f.nome}</div>
                  <div className="text-xs text-slate-500">{f.desc}</div>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
