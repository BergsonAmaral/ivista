import { createClient } from "@/lib/supabase/server";
import { criarCliente, criarAcessoCliente } from "@/lib/actions";
import { Card, PageTitle, Alert, inputCls, btnPrimary } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;
  const supabase = await createClient();
  const [{ data: clientes }, { data: acessos }] = await Promise.all([
    supabase.from("clientes").select("*").order("nome"),
    supabase.from("profiles").select("cliente_id").eq("role", "cliente"),
  ]);
  const temAcesso = new Set((acessos ?? []).map((a) => a.cliente_id));

  return (
    <div>
      <PageTitle
        title="Clientes / Parceiros"
        subtitle="Empresas contratantes — cadastre e crie o acesso de portal para elas agendarem sozinhas"
      />
      {erro && <Alert tipo="erro">{erro}</Alert>}
      {ok && <Alert tipo="ok">{ok}</Alert>}

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold mb-3">Nova empresa</h2>
          <form action={criarCliente} className="space-y-3">
            <input name="nome" required placeholder="Nome da empresa *" className={inputCls} />
            <input name="documento" placeholder="CNPJ" className={inputCls} />
            <input name="email" type="email" placeholder="E-mail" className={inputCls} />
            <input name="telefone" placeholder="Telefone" className={inputCls} />
            <input name="whatsapp" placeholder="WhatsApp" className={inputCls} />
            <SubmitButton className={`${btnPrimary} w-full`}>Cadastrar</SubmitButton>
          </form>
        </Card>

        <div className="lg:col-span-2 space-y-3">
          {(clientes ?? []).map((c) => (
            <Card key={c.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium">{c.nome}</div>
                {temAcesso.has(c.id) ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-semibold px-2 py-0.5">
                    ✓ portal ativo
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold px-2 py-0.5">
                    sem acesso ao portal
                  </span>
                )}
              </div>
              <div className="text-sm text-slate-500 mt-0.5">
                {[c.documento, c.email, c.telefone].filter(Boolean).join(" · ") || "sem contatos"}
              </div>

              {!temAcesso.has(c.id) && (
                <form
                  action={criarAcessoCliente}
                  className="mt-3 flex flex-wrap items-center gap-2"
                >
                  <input type="hidden" name="cliente_id" value={c.id} />
                  <input
                    name="email"
                    type="email"
                    required
                    placeholder="E-mail de acesso"
                    className={`${inputCls} w-auto flex-1 min-w-[180px]`}
                  />
                  <input
                    name="senha"
                    required
                    minLength={6}
                    placeholder="Senha provisória"
                    className={`${inputCls} w-auto flex-1 min-w-[140px]`}
                  />
                  <SubmitButton className={btnPrimary}>Criar acesso do portal</SubmitButton>
                </form>
              )}
            </Card>
          ))}
          {!clientes?.length && (
            <Card className="p-8 text-center text-slate-400 text-sm">
              Nenhuma empresa cadastrada.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
