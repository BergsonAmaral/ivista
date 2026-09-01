import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, PageTitle, Badge, btnPrimary } from "@/components/ui";
import { cancelarAgendamento } from "@/lib/actions";

export default async function AgendamentosPage() {
  const supabase = await createClient();
  const { data: agendamentos } = await supabase
    .from("agendamentos")
    .select("*, clientes(nome)")
    .neq("status", "cancelado")
    .order("data_agendada", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageTitle
        title="Fase 1 — Agendamentos"
        subtitle="Agenda unificada: todos os canais (telefone, WhatsApp, parceiros) num só lugar"
        action={
          <Link href="/agendamentos/novo" className={btnPrimary}>
            + Novo agendamento
          </Link>
        }
      />

      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500 uppercase">
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Placa / Veículo</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Endereço</th>
              <th className="px-4 py-3">Canal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(agendamentos ?? []).map((a) => (
              <tr key={a.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  {a.data_agendada
                    ? new Date(a.data_agendada + "T12:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                  {a.janela_inicio && (
                    <span className="text-zinc-400"> {String(a.janela_inicio).slice(0, 5)}</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="font-mono font-medium">{a.placa ?? "—"}</span>
                  <div className="text-xs text-zinc-500">
                    {[a.marca, a.modelo].filter(Boolean).join(" ")}
                  </div>
                </td>
                <td className="px-4 py-3">{a.clientes?.nome ?? "—"}</td>
                <td className="px-4 py-3 max-w-[220px] truncate">{a.endereco}</td>
                <td className="px-4 py-3">{a.canal}</td>
                <td className="px-4 py-3">
                  <Badge status={a.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  {(a.status === "solicitado" || a.status === "confirmado") && (
                    <form action={cancelarAgendamento.bind(null, a.id)}>
                      <button className="text-xs text-red-500 hover:underline">Cancelar</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {!agendamentos?.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                  Nenhum agendamento. Crie o primeiro para iniciar o fluxo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
