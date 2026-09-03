import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Usuário + perfil compartilhados por requisição (layout e página usam a MESMA
// consulta em vez de repetir idas ao banco).
export const getSessionProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role, cliente_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profile) return { user, profile };

  // fallback: cria o perfil a partir dos metadados (primeiro acesso)
  const meta = (user.user_metadata ?? {}) as { nome?: string; role?: string };
  const novo = {
    id: user.id,
    nome: meta.nome ?? user.email?.split("@")[0] ?? "Usuário",
    role: (meta.role ?? "atendente") as
      | "admin" | "atendente" | "vistoriador" | "digitadora" | "cliente",
  };
  await supabase.from("profiles").upsert(novo, { onConflict: "id" });
  return { user, profile: { nome: novo.nome, role: novo.role, cliente_id: null } };
});
