import { login, signup } from "@/lib/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; modo?: string }>;
}) {
  const { erro, modo } = await searchParams;
  const cadastro = modo === "cadastro";

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-xl border border-zinc-200 shadow-sm p-6">
        <h1 className="text-2xl font-bold tracking-tight">AI Super Visão Fortaleza</h1>
        <p className="text-sm text-zinc-500 mb-6">
          Gestão de vistorias automotivas
        </p>

        {erro && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm p-3">
            {erro}
          </div>
        )}

        <form action={cadastro ? signup : login} className="space-y-3">
          {cadastro && (
            <>
              <input
                name="nome"
                required
                placeholder="Nome completo"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
              <select
                name="role"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm bg-white"
              >
                <option value="atendente">Atendente</option>
                <option value="vistoriador">Vistoriador</option>
                <option value="digitadora">Digitadora</option>
                <option value="admin">Administrador</option>
              </select>
            </>
          )}
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            name="password"
            type="password"
            required
            minLength={6}
            placeholder="Senha"
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <button className="w-full rounded-lg bg-zinc-900 text-white py-2 text-sm font-medium hover:bg-zinc-700">
            {cadastro ? "Criar conta" : "Entrar"}
          </button>
        </form>

        <a
          href={cadastro ? "/login" : "/login?modo=cadastro"}
          className="block text-center text-sm text-zinc-500 mt-4 hover:text-zinc-900"
        >
          {cadastro ? "Já tenho conta — entrar" : "Criar nova conta"}
        </a>
      </div>
    </main>
  );
}
