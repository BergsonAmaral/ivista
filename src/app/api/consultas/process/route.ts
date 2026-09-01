import { NextRequest, NextResponse } from "next/server";
import { processarFilaConsultas } from "@/lib/consulta-worker";
import { createClient } from "@/lib/supabase/server";

// Processa a fila de consultas veiculares (Fase 4).
// Chamado pelo Vercel Cron (Bearer CRON_SECRET) ou por usuário autenticado
// (disparo imediato após criar uma consulta).
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const isCron = auth === `Bearer ${process.env.CRON_SECRET}`;

  let userClient = undefined;
  if (!isCron) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    userClient = supabase;
  }

  try {
    const result = await processarFilaConsultas(5, userClient);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "erro" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
