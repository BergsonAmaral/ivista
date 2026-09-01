"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function getSupabaseAndUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ===== AUTH =====
export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect(`/login?erro=${encodeURIComponent(error.message)}`);
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const nome = String(formData.get("nome"));
  const role = String(formData.get("role"));
  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error || !data.user)
    redirect(`/login?erro=${encodeURIComponent(error?.message ?? "falha no cadastro")}`);
  await supabase.from("profiles").insert({ id: data.user.id, nome, role });
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ===== FASE 1: AGENDAMENTO =====
export async function criarAgendamento(formData: FormData) {
  const { supabase, user } = await getSupabaseAndUser();

  const placa = String(formData.get("placa") ?? "").toUpperCase().trim();
  const dataAgendada = String(formData.get("data_agendada") ?? "");

  // anti-duplicidade: mesma placa no mesmo dia
  if (placa && dataAgendada) {
    const { data: dup } = await supabase
      .from("agendamentos")
      .select("id")
      .eq("placa", placa)
      .eq("data_agendada", dataAgendada)
      .neq("status", "cancelado")
      .limit(1);
    if (dup?.length) {
      redirect(
        `/agendamentos/novo?erro=${encodeURIComponent(
          `Já existe agendamento para a placa ${placa} em ${dataAgendada}`
        )}`
      );
    }
  }

  const { error } = await supabase.from("agendamentos").insert({
    canal: String(formData.get("canal") ?? "manual"),
    cliente_id: formData.get("cliente_id") || null,
    placa: placa || null,
    modelo: formData.get("modelo") || null,
    marca: formData.get("marca") || null,
    ano: formData.get("ano") || null,
    complexidade: String(formData.get("complexidade") ?? "media"),
    endereco: String(formData.get("endereco")),
    cidade: formData.get("cidade") || null,
    data_agendada: dataAgendada || null,
    janela_inicio: formData.get("janela_inicio") || null,
    janela_fim: formData.get("janela_fim") || null,
    contato_nome: formData.get("contato_nome") || null,
    contato_telefone: formData.get("contato_telefone") || null,
    observacoes: formData.get("observacoes") || null,
    status: "confirmado",
    criado_por: user.id,
  });
  if (error) redirect(`/agendamentos/novo?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/agendamentos");
  redirect("/agendamentos");
}

export async function cancelarAgendamento(id: string) {
  const { supabase } = await getSupabaseAndUser();
  await supabase.from("agendamentos").update({ status: "cancelado" }).eq("id", id);
  revalidatePath("/agendamentos");
}

export async function criarCliente(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  await supabase.from("clientes").insert({
    nome: String(formData.get("nome")),
    documento: formData.get("documento") || null,
    email: formData.get("email") || null,
    telefone: formData.get("telefone") || null,
    whatsapp: formData.get("whatsapp") || null,
  });
  revalidatePath("/clientes");
  redirect("/clientes");
}

// ===== FASE 2: ROTEIRIZAÇÃO =====
const TEMPO_POR_COMPLEXIDADE: Record<string, number> = {
  baixa: 40,
  media: 60,
  alta: 100,
};

export async function atribuirParada(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const agendamentoId = String(formData.get("agendamento_id"));
  const vistoriadorId = String(formData.get("vistoriador_id"));
  const data = String(formData.get("data"));

  // rota do dia (cria se não existir)
  let rotaId: string;
  const { data: rota } = await supabase
    .from("rotas")
    .select("id")
    .eq("vistoriador_id", vistoriadorId)
    .eq("data", data)
    .maybeSingle();
  if (rota) {
    rotaId = rota.id;
  } else {
    const { data: nova, error } = await supabase
      .from("rotas")
      .insert({ vistoriador_id: vistoriadorId, data })
      .select("id")
      .single();
    if (error) redirect(`/rotas?erro=${encodeURIComponent(error.message)}`);
    rotaId = nova.id;
  }

  const { data: ag } = await supabase
    .from("agendamentos")
    .select("complexidade")
    .eq("id", agendamentoId)
    .single();

  const { count } = await supabase
    .from("rota_paradas")
    .select("id", { count: "exact", head: true })
    .eq("rota_id", rotaId);

  const { error: perr } = await supabase.from("rota_paradas").insert({
    rota_id: rotaId,
    agendamento_id: agendamentoId,
    ordem: (count ?? 0) + 1,
    tempo_estimado_min: TEMPO_POR_COMPLEXIDADE[ag?.complexidade ?? "media"],
  });
  if (perr) redirect(`/rotas?erro=${encodeURIComponent(perr.message)}`);

  await supabase
    .from("agendamentos")
    .update({ status: "roteirizado" })
    .eq("id", agendamentoId);

  // cria a vistoria vinculada (Fases 3–6)
  await supabase
    .from("vistorias")
    .insert({ agendamento_id: agendamentoId, vistoriador_id: vistoriadorId })
    .select()
    .maybeSingle();

  revalidatePath("/rotas");
  revalidatePath("/vistorias");
}

// ===== FASE 3: COLETA (dispara a consulta da Fase 4 ao confirmar presença) =====
export async function confirmarColeta(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const vistoriaId = String(formData.get("vistoria_id"));
  const chaves = formData.get("coleta_chaves") === "on";
  const documento = formData.get("coleta_documento") === "on";
  const fotoInicial = formData.get("coleta_foto_inicial") === "on";

  if (!chaves || !documento || !fotoInicial) {
    redirect(
      `/vistorias/${vistoriaId}?erro=${encodeURIComponent(
        "Checklist de coleta incompleto: confirme chaves, documento e foto inicial"
      )}`
    );
  }

  const { data: vistoria } = await supabase
    .from("vistorias")
    .update({
      coleta_chaves: true,
      coleta_documento: true,
      coleta_foto_inicial: true,
      coleta_confirmada_em: new Date().toISOString(),
      status: "em_vistoria",
    })
    .eq("id", vistoriaId)
    .select("id, agendamento_id")
    .single();

  // Fase 4: dispara a consulta veicular SOMENTE após confirmação presencial
  if (vistoria) {
    const { data: ag } = await supabase
      .from("agendamentos")
      .select("placa")
      .eq("id", vistoria.agendamento_id)
      .single();
    if (ag?.placa) {
      const { data: existente } = await supabase
        .from("consultas_veiculares")
        .select("id")
        .eq("vistoria_id", vistoriaId)
        .in("status", ["pendente", "processando", "concluida"])
        .limit(1);
      if (!existente?.length) {
        await supabase.from("consultas_veiculares").insert({
          vistoria_id: vistoriaId,
          placa: ag.placa,
        });
      }
    }
    await supabase
      .from("agendamentos")
      .update({ status: "em_andamento" })
      .eq("id", vistoria.agendamento_id);
  }

  revalidatePath(`/vistorias/${vistoriaId}`);
}

// ===== FASE 5: VISTORIA (itens do checklist) =====
export async function salvarItemVistoria(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const vistoriaId = String(formData.get("vistoria_id"));
  const checklistItemId = String(formData.get("checklist_item_id"));
  const condicao = String(formData.get("condicao"));
  const fotoPath = formData.get("foto_path") ? String(formData.get("foto_path")) : null;

  const { error } = await supabase.from("vistoria_itens").upsert(
    {
      vistoria_id: vistoriaId,
      checklist_item_id: checklistItemId,
      condicao,
      ...(fotoPath ? { foto_path: fotoPath } : {}),
      marcado_em: new Date().toISOString(),
    },
    { onConflict: "vistoria_id,checklist_item_id" }
  );
  if (error)
    redirect(`/vistorias/${vistoriaId}?erro=${encodeURIComponent(error.message)}`);
  revalidatePath(`/vistorias/${vistoriaId}`);
}

export async function salvarDadosVistoria(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const vistoriaId = String(formData.get("vistoria_id"));
  await supabase
    .from("vistorias")
    .update({
      chassi_fisico: String(formData.get("chassi_fisico") ?? "").toUpperCase().trim() || null,
      chassi_documental: String(formData.get("chassi_documental") ?? "").toUpperCase().trim() || null,
      placa_confirmada: String(formData.get("placa_confirmada") ?? "").toUpperCase().trim() || null,
      km: formData.get("km") || null,
      observacoes: formData.get("observacoes") || null,
    })
    .eq("id", vistoriaId);
  revalidatePath(`/vistorias/${vistoriaId}`);
}

// ===== FASE 6: ENVIO (hard-block — o trigger do banco valida de novo) =====
export async function enviarVistoria(vistoriaId: string) {
  const { supabase } = await getSupabaseAndUser();
  const { error } = await supabase
    .from("vistorias")
    .update({ status: "enviada" })
    .eq("id", vistoriaId);

  if (error) {
    const msg = error.message.includes("HARD_BLOCK")
      ? error.message.replace(/^.*HARD_BLOCK: /, "Envio bloqueado: ")
      : error.message;
    redirect(`/vistorias/${vistoriaId}?erro=${encodeURIComponent(msg)}`);
  }

  // cria registro de conferência (Fase 7)
  await supabase
    .from("conferencias")
    .upsert({ vistoria_id: vistoriaId }, { onConflict: "vistoria_id" });
  await supabase
    .from("vistorias")
    .update({ status: "em_conferencia" })
    .eq("id", vistoriaId);

  revalidatePath(`/vistorias/${vistoriaId}`);
  revalidatePath("/conferencia");
  redirect(`/vistorias/${vistoriaId}?ok=enviada`);
}

// ===== FASE 7: CONFERÊNCIA =====
export async function concluirConferencia(formData: FormData) {
  const { supabase, user } = await getSupabaseAndUser();
  const vistoriaId = String(formData.get("vistoria_id"));
  const aprovada = formData.get("decisao") === "aprovar";
  const observacoes = formData.get("observacoes") ? String(formData.get("observacoes")) : null;

  await supabase
    .from("conferencias")
    .update({
      digitadora_id: user.id,
      aprovada,
      observacoes,
      concluida_em: new Date().toISOString(),
    })
    .eq("vistoria_id", vistoriaId);

  if (aprovada) {
    const { data: vistoria } = await supabase
      .from("vistorias")
      .update({ status: "aprovada" })
      .eq("id", vistoriaId)
      .select("agendamento_id")
      .single();

    // Fase 8: gera entrega automaticamente assim que aprovado
    let clienteId: string | null = null;
    if (vistoria) {
      const { data: ag } = await supabase
        .from("agendamentos")
        .select("cliente_id")
        .eq("id", vistoria.agendamento_id)
        .single();
      clienteId = ag?.cliente_id ?? null;
    }
    await supabase
      .from("entregas")
      .upsert({ vistoria_id: vistoriaId, cliente_id: clienteId }, { onConflict: "vistoria_id" });
  } else {
    // devolve ao vistoriador para correção
    await supabase
      .from("vistorias")
      .update({ status: "em_vistoria" })
      .eq("id", vistoriaId);
  }

  revalidatePath("/conferencia");
  revalidatePath("/entregas");
  redirect("/conferencia");
}

// ===== FASE 8: ENTREGA =====
export async function marcarEntregaEnviada(entregaId: string) {
  const { supabase } = await getSupabaseAndUser();
  const { data: entrega } = await supabase
    .from("entregas")
    .update({ status: "enviada", enviada_em: new Date().toISOString() })
    .eq("id", entregaId)
    .select("vistoria_id")
    .single();
  if (entrega) {
    await supabase
      .from("vistorias")
      .update({ status: "entregue" })
      .eq("id", entrega.vistoria_id);
  }
  revalidatePath("/entregas");
}
