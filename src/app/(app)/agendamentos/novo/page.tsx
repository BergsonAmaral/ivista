import { createClient } from "@/lib/supabase/server";
import { criarAgendamento } from "@/lib/actions";
import { Card, PageTitle, Alert, inputCls, btnPrimary } from "@/components/ui";

export default async function NovoAgendamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data: clientes } = await supabase.from("clientes").select("id, nome").order("nome");

  return (
    <div className="max-w-2xl">
      <PageTitle
        title="Novo agendamento"
        subtitle="Passo 1 de 2 do atendimento: registre a solicitação. Depois, roteirize na tela de Rotas."
      />
      {erro && <Alert tipo="erro">{erro}</Alert>}

      <form action={criarAgendamento}>
        <Card className="p-5 space-y-5">
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">1. Origem da solicitação</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Canal de entrada</span>
                <select name="canal" className={inputCls}>
                  <option value="telefone">Telefone</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="whatsapp_grupo">Grupo de parceiro</option>
                  <option value="portal">Portal</option>
                  <option value="manual">Manual</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Cliente / Parceiro</span>
                <select name="cliente_id" className={inputCls}>
                  <option value="">— sem vínculo —</option>
                  {(clientes ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">2. Veículo</legend>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Placa *</span>
                <input name="placa" required placeholder="ABC1D23" maxLength={7} className={`${inputCls} font-mono uppercase`} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Marca</span>
                <input name="marca" className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Modelo</span>
                <input name="modelo" className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Ano</span>
                <input name="ano" className={inputCls} />
              </label>
            </div>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">
                Complexidade da vistoria (define o tempo estimado na rota)
              </span>
              <select name="complexidade" defaultValue="media" className={inputCls}>
                <option value="baixa">Baixa — ~40 min</option>
                <option value="media">Média — ~60 min</option>
                <option value="alta">Alta — ~100 min (acesso difícil a componentes)</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">3. Local e data</legend>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Endereço *</span>
              <input name="endereco" required className={inputCls} />
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Cidade</span>
                <input name="cidade" className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Data *</span>
                <input name="data_agendada" type="date" required className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Janela início</span>
                <input name="janela_inicio" type="time" className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Janela fim</span>
                <input name="janela_fim" type="time" className={inputCls} />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold mb-1">4. Contato no local</legend>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Nome</span>
                <input name="contato_nome" className={inputCls} />
              </label>
              <label className="text-sm">
                <span className="block text-zinc-500 mb-1">Telefone/WhatsApp</span>
                <input name="contato_telefone" className={inputCls} />
              </label>
            </div>
            <label className="text-sm block">
              <span className="block text-zinc-500 mb-1">Observações</span>
              <textarea name="observacoes" rows={2} className={inputCls} />
            </label>
          </fieldset>

          <button className={`${btnPrimary} w-full`}>Confirmar agendamento</button>
        </Card>
      </form>
    </div>
  );
}
