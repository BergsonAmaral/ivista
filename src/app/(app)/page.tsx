import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Entrada por perfil: cada um cai direto na sua tela de trabalho.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user!.id)
    .maybeSingle();

  if (me?.role === "vistoriador") redirect("/minha-rota");
  if (me?.role === "cliente") redirect("/portal");
  redirect("/agendamentos");
}
