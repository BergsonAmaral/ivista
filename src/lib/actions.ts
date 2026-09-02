"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { geocodeEndereco } from "@/lib/geo";

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
  // Cadastro público DESATIVADO: acessos são criados pelo admin (Equipe/Empresas)
  void formData;
  redirect(
    "/login?erro=" +
      encodeURIComponent("Cadastro público desativado. Fale com o administrador.")
  );
}

// Garante que o perfil exista (fallback quando o signup ocorreu sem sessão)
export async function ensureProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile) return profile;
  const meta = (user.user_metadata ?? {}) as { nome?: string; role?: string };
  const novo = {
    id: user.id,
    nome: meta.nome ?? user.email?.split("@")[0] ?? "Usuário",
    role: (meta.role ?? "atendente") as
      | "admin"
      | "atendente"
      | "vistoriador"
      | "digitadora"
      | "cliente",
  };
  await supabase.from("profiles").upsert(novo, { onConflict: "id" });
  return { nome: novo.nome, role: novo.role };
}

// Recuperação de senha: envia e-mail com link para /redefinir
export async function recuperarSenha(formData: FormData) {
  const email = String(formData.get("email")).trim().toLowerCase();
  const origem = String(formData.get("origem") ?? "");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origem}/redefinir`,
  });
  // resposta neutra (não revela se o e-mail existe)
  redirect(
    "/recuperar?ok=" +
      encodeURIComponent("Se este e-mail estiver cadastrado, você receberá o link de redefinição.")
  );
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

  const geo = await geocodeEndereco(
    String(formData.get("endereco")),
    formData.get("cidade") ? String(formData.get("cidade")) : null
  );

  const { data: novo, error } = await supabase
    .from("agendamentos")
    .insert({
      latitude: geo?.lat ?? null,
      longitude: geo?.lng ?? null,
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
    })
    .select("id")
    .single();
  if (error || !novo)
    redirect(`/agendamentos/novo?erro=${encodeURIComponent(error?.message ?? "erro")}`);

  // Atalho do admin: atribuir o vistoriador já na criação (Fases 1+2 numa tela)
  const vistoriadorId = formData.get("vistoriador_id");
  if (vistoriadorId && dataAgendada) {
    const erroRota = await roteirizar(supabase, novo.id, String(vistoriadorId), dataAgendada);
    if (erroRota) redirect(`/agendamentos?erro=${encodeURIComponent(erroRota)}`);
  }

  revalidatePath("/agendamentos");
  redirect("/agendamentos");
}

// Agendamento PÚBLICO (canal portal): sem login, entra como "solicitado"
export async function solicitarAgendamentoPublico(formData: FormData) {
  const placa = String(formData.get("placa") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const endereco = String(formData.get("endereco") ?? "").trim();
  const contatoNome = String(formData.get("contato_nome") ?? "").trim();
  const contatoTel = String(formData.get("contato_telefone") ?? "").trim();
  const dataAgendada = String(formData.get("data_agendada") ?? "");

  if (placa.length < 7 || !endereco || !contatoNome || !contatoTel || !dataAgendada) {
    redirect(`/agendar?erro=${encodeURIComponent("Preencha todos os campos obrigatórios")}`);
  }

  const geoPub = await geocodeEndereco(
    endereco,
    String(formData.get("cidade") ?? "") || null
  );

  const admin = createAdminClient();
  const { error } = await admin.from("agendamentos").insert({
    canal: "portal",
    status: "solicitado",
    latitude: geoPub?.lat ?? null,
    longitude: geoPub?.lng ?? null,
    placa,
    modelo: String(formData.get("modelo") ?? "").trim() || null,
    endereco,
    cidade: String(formData.get("cidade") ?? "").trim() || null,
    data_agendada: dataAgendada,
    contato_nome: contatoNome,
    contato_telefone: contatoTel,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
  });
  if (error) redirect(`/agendar?erro=${encodeURIComponent("Não foi possível registrar. Tente novamente.")}`);
  revalidatePath("/");
  revalidatePath("/agendamentos");
  redirect("/agendar?ok=1");
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

// Acesso de portal para a empresa cliente (login e senha) — admin/atendente
export async function criarAcessoCliente(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const clienteId = String(formData.get("cliente_id"));
  const email = String(formData.get("email")).trim().toLowerCase();
  const senha = String(formData.get("senha"));

  const { data: cliente } = await supabase
    .from("clientes")
    .select("nome")
    .eq("id", clienteId)
    .single();
  if (!cliente) redirect("/clientes?erro=Cliente%20n%C3%A3o%20encontrado");

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome: cliente.nome },
  });
  if (error || !data.user)
    redirect(`/clientes?erro=${encodeURIComponent(error?.message ?? "falha ao criar acesso")}`);

  await admin.from("profiles").upsert({
    id: data.user.id,
    nome: cliente.nome,
    role: "cliente",
    cliente_id: clienteId,
  });
  revalidatePath("/clientes");
  redirect(`/clientes?ok=${encodeURIComponent(`Acesso criado para ${cliente.nome}`)}`);
}

// Agendamento feito pela empresa logada no portal
export async function agendarPeloPortal(formData: FormData) {
  const { supabase, user } = await getSupabaseAndUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("cliente_id, role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "cliente" || !me.cliente_id) redirect("/portal?erro=Acesso%20inv%C3%A1lido");

  const placa = String(formData.get("placa") ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const endereco = String(formData.get("endereco") ?? "").trim();
  const dataAgendada = String(formData.get("data_agendada") ?? "");
  if (placa.length < 7 || !endereco || !dataAgendada) {
    redirect(`/portal?erro=${encodeURIComponent("Preencha placa, endereço e data")}`);
  }

  const geo = await geocodeEndereco(endereco, String(formData.get("cidade") ?? "") || null);

  const { error } = await supabase.from("agendamentos").insert({
    canal: "portal",
    status: "solicitado",
    cliente_id: me.cliente_id,
    placa,
    modelo: String(formData.get("modelo") ?? "").trim() || null,
    endereco,
    cidade: String(formData.get("cidade") ?? "").trim() || null,
    data_agendada: dataAgendada,
    contato_nome: String(formData.get("contato_nome") ?? "").trim() || null,
    contato_telefone: String(formData.get("contato_telefone") ?? "").trim() || null,
    observacoes: String(formData.get("observacoes") ?? "").trim() || null,
    latitude: geo?.lat ?? null,
    longitude: geo?.lng ?? null,
  });
  if (error) redirect(`/portal?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/portal");
  redirect("/portal?ok=1");
}

// ===== FASE 2: ROTEIRIZAÇÃO =====
const TEMPO_POR_COMPLEXIDADE: Record<string, number> = {
  baixa: 40,
  media: 60,
  alta: 100,
};

type AnySupabase = Awaited<ReturnType<typeof createClient>>;

// Núcleo da roteirização: cria rota do dia, parada e a vistoria vinculada.
async function roteirizar(
  supabase: AnySupabase,
  agendamentoId: string,
  vistoriadorId: string,
  data: string
): Promise<string | null> {
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
    if (error) return error.message;
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
  if (perr) return perr.message;

  await supabase
    .from("agendamentos")
    .update({ status: "roteirizado" })
    .eq("id", agendamentoId);

  await supabase
    .from("vistorias")
    .insert({ agendamento_id: agendamentoId, vistoriador_id: vistoriadorId })
    .select()
    .maybeSingle();

  revalidatePath("/rotas");
  revalidatePath("/vistorias");
  revalidatePath("/");
  return null;
}

export async function atribuirParada(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const erro = await roteirizar(
    supabase,
    String(formData.get("agendamento_id")),
    String(formData.get("vistoriador_id")),
    String(formData.get("data"))
  );
  if (erro) redirect(`/rotas?erro=${encodeURIComponent(erro)}`);
}

// Check simples de conclusão da visita (fase 1 do lançamento, sem o laudo digital)
export async function concluirVisita(agendamentoId: string) {
  const { supabase } = await getSupabaseAndUser();
  const { error } = await supabase
    .from("agendamentos")
    .update({ status: "concluido" })
    .eq("id", agendamentoId);
  if (error) redirect(`/minha-rota?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/minha-rota");
  revalidatePath("/rotas");
  revalidatePath("/agendamentos");
}

// ===== FASE 3: COLETA (dispara a consulta da Fase 4 ao confirmar presença) =====
export async function salvarFotoColeta(vistoriaId: string, fotoPath: string) {
  const { supabase } = await getSupabaseAndUser();
  await supabase
    .from("vistorias")
    .update({ coleta_foto_path: fotoPath })
    .eq("id", vistoriaId);
  revalidatePath(`/vistorias/${vistoriaId}`);
}

export async function confirmarColeta(formData: FormData) {
  const { supabase } = await getSupabaseAndUser();
  const vistoriaId = String(formData.get("vistoria_id"));
  const chaves = formData.get("coleta_chaves") === "on";
  const documento = formData.get("coleta_documento") === "on";

  if (!chaves || !documento) {
    redirect(
      `/vistorias/${vistoriaId}?erro=${encodeURIComponent(
        "Checklist de coleta incompleto: confirme chaves e documento"
      )}`
    );
  }

  // Trava real da foto inicial: precisa existir no Storage (não é checkbox)
  const { data: atual } = await supabase
    .from("vistorias")
    .select("coleta_foto_path")
    .eq("id", vistoriaId)
    .single();
  if (!atual?.coleta_foto_path) {
    redirect(
      `/vistorias/${vistoriaId}?erro=${encodeURIComponent(
        "Envie a foto inicial do veículo antes de confirmar a coleta"
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

// ===== EQUIPE (admin) =====
export async function criarMembroEquipe(formData: FormData) {
  const { supabase, user } = await getSupabaseAndUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/equipe?erro=Apenas%20administradores");

  const nome = String(formData.get("nome"));
  const email = String(formData.get("email")).trim().toLowerCase();
  const senha = String(formData.get("senha"));
  const role = String(formData.get("role"));

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
    user_metadata: { nome },
  });
  if (error || !data.user)
    redirect(`/equipe?erro=${encodeURIComponent(error?.message ?? "falha ao criar usuário")}`);

  await admin.from("profiles").upsert({ id: data.user.id, nome, role });
  revalidatePath("/equipe");
  redirect(`/equipe?ok=${encodeURIComponent(`${nome} criado como ${role}`)}`);
}

export async function atualizarMembroEquipe(formData: FormData) {
  const { supabase, user } = await getSupabaseAndUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/equipe?erro=Apenas%20administradores");

  const enderecoBase = formData.get("endereco_base")
    ? String(formData.get("endereco_base")).trim()
    : null;
  let baseGeo: { lat: number; lng: number } | null = null;
  if (enderecoBase) baseGeo = await geocodeEndereco(enderecoBase, "Fortaleza");

  const { error } = await supabase
    .from("profiles")
    .update({
      role: String(formData.get("role")),
      ativo: formData.get("ativo") === "on",
      endereco_base: enderecoBase,
      ...(baseGeo ? { base_lat: baseGeo.lat, base_lng: baseGeo.lng } : {}),
    })
    .eq("id", String(formData.get("profile_id")));
  if (error) redirect(`/equipe?erro=${encodeURIComponent(error.message)}`);
  revalidatePath("/equipe");
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
