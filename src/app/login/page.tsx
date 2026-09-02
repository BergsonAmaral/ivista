import { login, signup } from "@/lib/actions";
import { inputCls, btnPrimary } from "@/components/ui";

const FASES = [
  "Agenda unificada omnichannel",
  "Roteirização por complexidade",
  "Consulta veicular automática com retry",
  "Trava de envio — laudo sempre completo",
  "Conferência assistida e entrega com link seguro",
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; modo?: string }>;
}) {
  const { erro, modo } = await searchParams;
  const cadastro = modo === "cadastro";

  return (
    <main className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      {/* Painel de marca */}
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 text-white p-12 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-indigo-600/30 blur-3xl" />
        <div className="absolute -bottom-40 -left-24 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 font-black shadow-lg shadow-indigo-900/40">
            AI
          </span>
          <div className="font-bold text-lg leading-tight">
            Super Visão Fortaleza
            <span className="block text-xs font-medium text-slate-400">
              Gestão de vistorias automotivas
            </span>
          </div>
        </div>
        <div className="relative">
          <h2 className="text-3xl font-bold leading-snug mb-6">
            Da chegada do pedido
            <br />à entrega do laudo —
            <br />
            <span className="text-indigo-400">sem gargalos.</span>
          </h2>
          <ul className="space-y-3">
            {FASES.map((f) => (
              <li key={f} className="flex items-center gap-3 text-sm text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 text-[11px]">
                  ✓
                </span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          Fluxo operacional completo em 8 fases · Fortaleza, CE
        </p>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-black shadow-md">
              AI
            </span>
            <span className="font-bold text-slate-900">Super Visão Fortaleza</span>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {cadastro ? "Criar conta" : "Bem-vindo de volta"}
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            {cadastro
              ? "Preencha seus dados para entrar na equipe"
              : "Entre para acessar o painel operacional"}
          </p>

          {erro && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3.5">
              {erro}
            </div>
          )}

          <form action={cadastro ? signup : login} className="space-y-3">
            {cadastro && (
              <>
                <input name="nome" required placeholder="Nome completo" className={inputCls} />
                <p className="text-xs text-slate-500">
                  Após o cadastro, o administrador define sua função na tela Equipe.
                </p>
              </>
            )}
            <input name="email" type="email" required placeholder="E-mail" className={inputCls} />
            <input
              name="password"
              type="password"
              required
              minLength={6}
              placeholder="Senha"
              className={inputCls}
            />
            <button className={`${btnPrimary} w-full`}>
              {cadastro ? "Criar conta" : "Entrar"}
            </button>
          </form>

          <a
            href={cadastro ? "/login" : "/login?modo=cadastro"}
            className="block text-center text-sm text-slate-500 mt-5 hover:text-indigo-600 transition-colors"
          >
            {cadastro ? "Já tenho conta — entrar" : "Não tem conta? Criar nova conta"}
          </a>
        </div>
      </div>
    </main>
  );
}
