import { createClient } from "@/lib/supabase/server";
import { marcarEntregaEnviada } from "@/lib/actions";
import { Card, PageTitle, Badge, btnPrimary } from "@/components/ui";
import { CopiarLink } from "@/components/CopiarLink";

export default async function EntregasPage() {
  const supabase = await createClient();
  const { data: entregas } = await supabase
    .from("entregas")
    .select(
      "id, status, token_acesso, enviada_em, visualizada_em, created_at, clientes(nome, email, whatsapp), vistorias(id, agendamentos(placa, marca, modelo))"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageTitle
        title="Entregas"
        subtitle="Laudos aprovados geram link seguro automaticamente. Envie ao cliente e acompanhe a visualização."
      />
      <div className="space-y-3">
        {(entregas ?? []).map((e) => {
          const v = e.vistorias as unknown as {
            id: string;
            agendamentos: { placa: string; marca: string; modelo: string } | null;
          } | null;
          const cliente = e.clientes as unknown as { nome: string; email: string; whatsapp: string } | null;
          return (
            <Card key={e.id} className="p-4">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono font-semibold">{v?.agendamentos?.placa}</span>
                <span className="text-sm text-zinc-500">
                  {[v?.agendamentos?.marca, v?.agendamentos?.modelo].filter(Boolean).join(" ")}
                </span>
                <Badge status={e.status} />
                <span className="text-sm text-zinc-500">
                  {cliente ? `→ ${cliente.nome}` : "sem cliente vinculado"}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <CopiarLink token={e.token_acesso} />
                  {e.status === "pendente" && (
                    <form action={marcarEntregaEnviada.bind(null, e.id)}>
                      <button className={btnPrimary}>Marcar como enviada</button>
                    </form>
                  )}
                </div>
              </div>
              <div className="text-xs text-zinc-400 mt-2">
                Gerada {new Date(e.created_at).toLocaleString("pt-BR")}
                {e.enviada_em ? ` · enviada ${new Date(e.enviada_em).toLocaleString("pt-BR")}` : ""}
                {e.visualizada_em ? ` · visualizada ${new Date(e.visualizada_em).toLocaleString("pt-BR")}` : ""}
              </div>
            </Card>
          );
        })}
        {!entregas?.length && (
          <Card className="p-8 text-center text-zinc-400 text-sm">
            Nenhuma entrega. Elas são geradas automaticamente quando a conferência aprova um laudo.
          </Card>
        )}
      </div>
    </div>
  );
}
