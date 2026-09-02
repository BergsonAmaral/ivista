"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { inputCls, btnPrimary } from "@/components/ui";

export function NovaSenhaForm() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) {
      setErro("Use pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }
    setSalvando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={salvar} className="space-y-3">
      {erro && (
        <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          {erro}
        </div>
      )}
      <input
        type="password"
        required
        minLength={8}
        placeholder="Nova senha (mín. 8)"
        value={senha}
        onChange={(e) => setSenha(e.target.value)}
        className={inputCls}
      />
      <input
        type="password"
        required
        placeholder="Confirmar nova senha"
        value={confirma}
        onChange={(e) => setConfirma(e.target.value)}
        className={inputCls}
      />
      <button disabled={salvando} className={`${btnPrimary} w-full`}>
        {salvando ? "Salvando…" : "Salvar nova senha"}
      </button>
    </form>
  );
}
