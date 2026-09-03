import { headers } from "next/headers";
import { recuperarSenha } from "@/lib/actions";
import { inputCls, btnPrimary } from "@/components/ui";
import { SubmitButton } from "@/components/SubmitButton";

// Esqueci minha senha: envia o link de redefinição por e-mail
export default async function RecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { ok } = await searchParams;
  const h = await headers();
  const origem = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}`;

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Super Visão Fortaleza" className="h-10 w-auto mx-auto" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Recuperar senha</h1>
        <p className="text-sm text-slate-500 mb-5">
          Informe seu e-mail e enviaremos o link para criar uma nova senha.
        </p>

        {ok && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm p-3.5">
            {ok}
          </div>
        )}

        <form action={recuperarSenha} className="space-y-3">
          <input type="hidden" name="origem" value={origem} />
          <input name="email" type="email" required placeholder="Seu e-mail" className={inputCls} />
          <SubmitButton className={`${btnPrimary} w-full`}>Enviar link de recuperação</SubmitButton>
        </form>

        <a
          href="/login"
          className="block text-center text-sm text-slate-500 mt-5 hover:text-red-600"
        >
          Voltar ao login
        </a>
      </div>
    </main>
  );
}
