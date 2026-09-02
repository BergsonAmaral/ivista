import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, Badge } from "@/components/ui";

export default async function Dashboard() {
  const supabase = await createClient();

  // Vistoriador vai direto para o seu trabalho — o painel é da operação interna
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user!.id)
    .maybeSingle();
  if (me?.role === "vistoriador") redirect("/vistorias");
  if (me?.role === "cliente") redirect("/portal");

  const hoje = new Date().toISOString().slice(0, 10);

  const [conferenciasPend, entregasPend, { count: rotasHoje }, consultasFalha] =
    await Promise.all([
      supabase
        .from("vistorias")
        .select("id", { count: "exact", head: true })
        .eq("status", "em_conferencia"),
      supabase
        .from("entregas")
        .select("id", { count: "exact", head: true })
        .eq("status", "pendente"),
      supabase
        .from("rotas")
        .select("id", { count: "exact", head: true })
        .eq("data", hoje),
      supabase
        .from("consultas_veiculares")
        .select("id", { count: "exact", head: true })
        .eq("status", "falha"),
    ]);

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

  const primeiroNome = (me?.nome ?? "").split(" ")[0];
  const dataLonga = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const atalhos = [
    {
      href: "/agendamentos/novo",
      titulo: "Agendar vistoria",
      desc: "Registrar novo pedido",
      icone: "📅",
      destaque: true,
    },
    {
      href: "/rotas",
      titulo: "Rotas de hoje",
      desc: `${rotasHoje ?? 0} rota(s) em campo`,
      icone: "🗺️",
    },
    {
      href: "/conferencia",
      titulo: "Conferir laudos",
      desc: `${conferenciasPend.count ?? 0} aguardando`,
      icone: "🔍",
    },
    {
      href: "/entregas",
      titulo: "Entregas",
      desc: `${entregasPend.count ?? 0} para enviar`,
      icone: "📨",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋
        </h1>
        <p className="text-sm text-slate-500 capitalize">{dataLonga}</p>
      </div>

      {/* Ações principais — botões grandes e diretos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        {atalhos.map((a) => (
          <Link key={a.href + a.titulo} href={a.href}>
            <div
              className={`rounded-2xl p-4 h-full transition-all hover:-translate-y-0.5 hover:shadow-md ${
                a.destaque
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                  : "bg-white border border-zinc-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
              }`}
            >
              <div className="text-2xl mb-2">{a.icone}</div>
              <div className={`font-bold text-sm ${a.destaque ? "" : "text-slate-900"}`}>
                {a.titulo}
              </div>
              <div
                className={`text-xs mt-0.5 ${
                  a.destaque ? "text-indigo-200" : "text-slate-500"
                }`}
              >
                {a.desc}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {(consultasFalha.count ?? 0) > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm p-3.5">
          ⚠ {consultasFalha.count} consulta(s) veicular(es) com falha —{" "}
          <Link href="/vistorias" className="underline font-semibold">
            verificar
          </Link>
        </div>
      )}

      {/* Fila de trabalho */}
      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Precisa de você agora {acoes.length > 0 && `(${acoes.length})`}
      </h2>
      <Card className="divide-y divide-zinc-100">
        {acoes.length === 0 && (
          <div className="p-8 text-center text-sm text-slate-400">
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
    </div>
  );
}
