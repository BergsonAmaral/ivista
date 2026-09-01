import { createClient } from "@/lib/supabase/server";
import { criarCliente } from "@/lib/actions";
import { Card, PageTitle, inputCls, btnPrimary } from "@/components/ui";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: clientes } = await supabase.from("clientes").select("*").order("nome");

  return (
    <div>
      <PageTitle title="Clientes / Parceiros" subtitle="Empresas contratantes que recebem os laudos" />
      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="p-5 h-fit">
          <h2 className="text-sm font-semibold mb-3">Novo cliente</h2>
          <form action={criarCliente} className="space-y-3">
            <input name="nome" required placeholder="Nome da empresa *" className={inputCls} />
            <input name="documento" placeholder="CNPJ" className={inputCls} />
            <input name="email" type="email" placeholder="E-mail (recebe laudos)" className={inputCls} />
            <input name="telefone" placeholder="Telefone" className={inputCls} />
            <input name="whatsapp" placeholder="WhatsApp" className={inputCls} />
            <button className={`${btnPrimary} w-full`}>Cadastrar</button>
          </form>
        </Card>
        <div className="lg:col-span-2 space-y-3">
          {(clientes ?? []).map((c) => (
            <Card key={c.id} className="p-4">
              <div className="font-medium">{c.nome}</div>
              <div className="text-sm text-zinc-500">
                {[c.documento, c.email, c.telefone].filter(Boolean).join(" · ") || "sem contatos"}
              </div>
            </Card>
          ))}
          {!clientes?.length && (
            <Card className="p-8 text-center text-zinc-400 text-sm">Nenhum cliente cadastrado.</Card>
          )}
        </div>
      </div>
    </div>
  );
}
