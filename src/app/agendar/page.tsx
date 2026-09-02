import { solicitarAgendamentoPublico } from "@/lib/actions";
import { inputCls, btnPrimary } from "@/components/ui";

// Página PÚBLICA de agendamento — o cliente/parceiro solicita sem login.
// O pedido entra como "Solicitado" e a equipe confirma e roteiriza.
export default async function AgendarPublicoPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const { erro, ok } = await searchParams;

  if (ok) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-sm p-8 text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Solicitação recebida!</h1>
          <p className="text-sm text-slate-500">
            Nossa equipe vai confirmar o agendamento e entrar em contato pelo telefone
            informado. Obrigado!
          </p>
          <a
            href="/agendar"
            className="inline-block mt-6 text-sm text-indigo-600 font-semibold hover:underline"
          >
            Fazer outra solicitação
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-lg mx-auto">
        <div className="flex items-center gap-2.5 mb-6 justify-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black shadow-md">
            AI
          </span>
          <span className="font-bold text-slate-900">Super Visão Fortaleza</span>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
          <h1 className="text-xl font-bold text-slate-900">Agendar vistoria</h1>
          <p className="text-sm text-slate-500 mb-5">
            Preencha os dados e nossa equipe confirma o horário com você.
          </p>

          {erro && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3.5">
              {erro}
            </div>
          )}

          <form action={solicitarAgendamentoPublico} className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold mb-1">Seus dados</legend>
              <input name="contato_nome" required placeholder="Seu nome *" className={inputCls} />
              <input
                name="contato_telefone"
                required
                placeholder="Telefone / WhatsApp *"
                className={inputCls}
              />
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold mb-1">Veículo</legend>
              <div className="grid grid-cols-2 gap-3">
                <input
                  name="placa"
                  required
                  maxLength={7}
                  placeholder="Placa *"
                  className={`${inputCls} font-mono uppercase`}
                />
                <input name="modelo" placeholder="Modelo (ex: Gol 1.6)" className={inputCls} />
              </div>
            </fieldset>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold mb-1">Onde e quando</legend>
              <input
                name="endereco"
                required
                placeholder="Endereço da vistoria *"
                className={inputCls}
              />
              <div className="grid grid-cols-2 gap-3">
                <input name="cidade" placeholder="Cidade" className={inputCls} />
                <input name="data_agendada" type="date" required className={inputCls} />
              </div>
              <textarea
                name="observacoes"
                rows={2}
                placeholder="Observações (opcional)"
                className={inputCls}
              />
            </fieldset>

            <button className={`${btnPrimary} w-full`}>Solicitar agendamento</button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Você receberá a confirmação por telefone ou WhatsApp.
        </p>
      </div>
    </main>
  );
}
