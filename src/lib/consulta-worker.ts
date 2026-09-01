import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/server";
import { getVehicleQueryProvider } from "@/lib/providers/vehicle-query";

// Backoff exponencial: 30s, 1m, 2m, 4m, 8m
function backoffSeconds(tentativas: number) {
  return 30 * Math.pow(2, tentativas);
}

// client: passa o client autenticado do usuário (disparo manual) ou nada (cron → service role)
export async function processarFilaConsultas(limit = 5, client?: SupabaseClient) {
  const supabase = client ?? createAdminClient();
  const provider = getVehicleQueryProvider();

  const { data: pendentes, error } = await supabase
    .from("consultas_veiculares")
    .select("id, placa, tentativas, max_tentativas")
    .eq("status", "pendente")
    .lte("proximo_retry_em", new Date().toISOString())
    .order("created_at")
    .limit(limit);

  if (error) throw new Error(error.message);
  if (!pendentes?.length) return { processadas: 0, resultados: [] };

  const resultados: { id: string; status: string }[] = [];

  for (const c of pendentes) {
    await supabase
      .from("consultas_veiculares")
      .update({ status: "processando" })
      .eq("id", c.id);

    const res = await provider.query(c.placa);
    const tentativas = c.tentativas + 1;

    if (res.ok) {
      await supabase
        .from("consultas_veiculares")
        .update({
          status: "concluida",
          tentativas,
          resultado: res.data,
          erro: null,
          provider: provider.name,
        })
        .eq("id", c.id);
      resultados.push({ id: c.id, status: "concluida" });
    } else if (tentativas >= c.max_tentativas) {
      await supabase
        .from("consultas_veiculares")
        .update({ status: "falha", tentativas, erro: res.error })
        .eq("id", c.id);
      resultados.push({ id: c.id, status: "falha" });
    } else {
      await supabase
        .from("consultas_veiculares")
        .update({
          status: "pendente",
          tentativas,
          erro: res.error,
          proximo_retry_em: new Date(
            Date.now() + backoffSeconds(tentativas) * 1000
          ).toISOString(),
        })
        .eq("id", c.id);
      resultados.push({ id: c.id, status: "retry_agendado" });
    }
  }

  return { processadas: resultados.length, resultados };
}
