import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { agendarPeloPortal } from "@/lib/actions";
import { Card, PageTitle, Alert, Badge, inputCls, btnPrimary } from "@/components/ui";
import { CopiarLink } from "@/components/CopiarLink";
import { SubmitButton } from "@/components/SubmitButton";

// Portal da empresa cliente: agenda vistorias e acompanha laudos
export default async function PortalPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role, cliente_id, nome")
    .eq("id", user!.id)
    .maybeSingle();
  if (me?.role !== "cliente" || !me.cliente_id) redirect("/");

  const [{ data: agendamentos }, { data: entregas }] = await Promise.all([
    supabase
      .from("agendamentos")
      .select("id, placa, modelo, endereco, data_agendada, status, created_at")
      .eq("cliente_id", me.cliente_id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("entregas")
      .select("id, token_acesso, status, created_at, vistorias(agendamentos(placa))")
      .eq("cliente_id", me.cliente_id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="max-w-2xl mx-auto">
      <PageTitle
        title={`Portal — ${me.nome}`}
        subtitle="Agende vistorias e acompanhe seus laudos"
      />

      {erro && <Alert tipo="erro">{erro}</Alert>}
      {ok && (
        <Alert tipo="ok">
          Solicitação enviada! Nossa equipe confirma o agendamento em breve.
        </Alert>
      )}

      <Card className="p-5 mb-6">
        <h2 className="font-semibold mb-3">Nova solicitação de vistoria</h2>
        <form action={agendarPeloPortal} className="grid sm:grid-cols-2 gap-3">
          <input
            name="placa"
            required
            maxLength={7}
            placeholder="Placa *"
            className={`${inputCls} font-mono uppercase`}
          />
          <input name="modelo" placeholder="Modelo" className={inputCls} />
          <input
            name="endereco"
            required
            placeholder="Endereço da vistoria *"
            className={`${inputCls} sm:col-span-2`}
          />
          <input name="cidade" placeholder="Cidade" className={inputCls} />
          <input name="data_agendada" type="date" required className={inputCls} />
          <input name="contato_nome" placeholder="Contato no local" className={inputCls} />
          <input name="contato_telefone" placeholder="Telefone do contato" className={inputCls} />
          <textarea
            name="observacoes"
            rows={2}
            placeholder="Observações (opcional)"
            className={`${inputCls} sm:col-span-2`}
          />
          <SubmitButton className={`${btnPrimary} sm:col-span-2`}>Solicitar vistoria</SubmitButton>
        </form>
      </Card>

      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Laudos prontos
      </h2>
      <div className="space-y-2 mb-6">
        {(entregas ?? []).map((e) => {
          const placa =
            (e.vistorias as unknown as { agendamentos: { placa: string } })?.agendamentos
              ?.placa ?? "—";
          return (
            <Card key={e.id} className="p-4 flex items-center gap-3">
              <span className="font-mono font-semibold text-sm">{placa}</span>
              <Badge status={e.status} />
              <span className="text-xs text-slate-400">
                {new Date(e.created_at).toLocaleDateString("pt-BR")}
              </span>
              <div className="ml-auto flex items-center gap-2">
                <a
                  href={`/laudo/${e.token_acesso}`}
                  target="_blank"
                  className="rounded-lg bg-red-600 text-white px-3.5 py-1.5 text-xs font-semibold hover:bg-red-500"
                >
                  Abrir laudo
                </a>
                <CopiarLink token={e.token_acesso} />
              </div>
            </Card>
          );
        })}
        {!entregas?.length && (
          <Card className="p-6 text-center text-sm text-slate-400">
            Nenhum laudo disponível ainda.
          </Card>
        )}
      </div>

      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
        Minhas solicitações
      </h2>
      <div className="space-y-2">
        {(agendamentos ?? []).map((a) => (
          <Card key={a.id} className="p-4 flex items-center gap-3 flex-wrap">
            <span className="font-mono font-semibold text-sm">{a.placa}</span>
            <span className="text-sm text-slate-500">{a.modelo}</span>
            <Badge status={a.status} />
            <span className="ml-auto text-xs text-slate-400">
              {a.data_agendada
                ? new Date(a.data_agendada + "T12:00:00").toLocaleDateString("pt-BR")
                : ""}
            </span>
          </Card>
        ))}
        {!agendamentos?.length && (
          <Card className="p-6 text-center text-sm text-slate-400">
            Nenhuma solicitação ainda — use o formulário acima.
          </Card>
        )}
      </div>
    </div>
  );
}
