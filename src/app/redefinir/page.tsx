import { createClient } from "@/lib/supabase/server";
import { NovaSenhaForm } from "@/components/NovaSenhaForm";

// Definir nova senha — serve tanto para quem chegou pelo link de recuperação
// (troca o ?code= por sessão) quanto para usuário logado trocando a senha.
export default async function RedefinirPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const supabase = await createClient();

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <div className="text-center mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Super Visão Fortaleza" className="h-10 w-auto mx-auto" />
        </div>
        {user ? (
          <>
            <h1 className="text-xl font-bold text-slate-900">Nova senha</h1>
            <p className="text-sm text-slate-500 mb-5">
              Conta: <b>{user.email}</b>
            </p>
            <NovaSenhaForm />
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-slate-900">Link inválido ou expirado</h1>
            <p className="text-sm text-slate-500 mt-2">
              Peça um novo link em{" "}
              <a href="/recuperar" className="text-red-600 font-semibold hover:underline">
                recuperar senha
              </a>
              .
            </p>
          </>
        )}
      </div>
    </main>
  );
}
