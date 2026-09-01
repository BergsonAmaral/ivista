-- VISTA — Sistema de Gestão de Vistorias Automotivas
-- Schema inicial: cobre as 8 fases do fluxo operacional

-- ===== ENUMS =====
create type user_role as enum ('admin', 'atendente', 'vistoriador', 'digitadora');
create type canal_entrada as enum ('telefone', 'whatsapp', 'whatsapp_grupo', 'portal', 'manual');
create type agendamento_status as enum ('solicitado', 'confirmado', 'roteirizado', 'em_andamento', 'concluido', 'cancelado');
create type complexidade_veiculo as enum ('baixa', 'media', 'alta');
create type vistoria_status as enum ('aguardando', 'coleta', 'em_vistoria', 'enviada', 'em_conferencia', 'aprovada', 'entregue', 'rejeitada');
create type consulta_status as enum ('pendente', 'processando', 'concluida', 'falha', 'cancelada');
create type condicao_item as enum ('bom', 'regular', 'danificado', 'ausente', 'nao_aplicavel');
create type entrega_status as enum ('pendente', 'enviada', 'visualizada');

-- ===== PROFILES (extensão de auth.users) =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role user_role not null default 'atendente',
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

-- ===== CLIENTES (empresas contratantes / parceiros) =====
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text, -- CNPJ/CPF
  email text,
  telefone text,
  whatsapp text,
  created_at timestamptz not null default now()
);

-- ===== FASE 1: AGENDAMENTOS (agenda unificada omnichannel) =====
create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  canal canal_entrada not null default 'manual',
  status agendamento_status not null default 'solicitado',
  -- dados preliminares do veículo
  placa text,
  modelo text,
  marca text,
  ano text,
  complexidade complexidade_veiculo not null default 'media',
  -- local e janela
  endereco text not null,
  cidade text,
  latitude double precision,
  longitude double precision,
  data_agendada date,
  janela_inicio time,
  janela_fim time,
  contato_nome text,
  contato_telefone text,
  observacoes text,
  criado_por uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- índice anti-duplicidade: mesma placa no mesmo dia gera alerta na aplicação
create index idx_agendamentos_placa_data on agendamentos (placa, data_agendada);
create index idx_agendamentos_status on agendamentos (status);

-- ===== FASE 2: ROTAS =====
create table rotas (
  id uuid primary key default gen_random_uuid(),
  vistoriador_id uuid not null references profiles(id),
  data date not null,
  observacoes text,
  created_at timestamptz not null default now(),
  unique (vistoriador_id, data)
);

create table rota_paradas (
  id uuid primary key default gen_random_uuid(),
  rota_id uuid not null references rotas(id) on delete cascade,
  agendamento_id uuid not null references agendamentos(id),
  ordem int not null,
  tempo_estimado_min int not null default 60, -- calculado pela complexidade
  hora_prevista time,
  unique (rota_id, ordem),
  unique (agendamento_id)
);

-- ===== FASES 3–6: VISTORIAS =====
create table vistorias (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) unique,
  vistoriador_id uuid references profiles(id),
  status vistoria_status not null default 'aguardando',
  -- Fase 3: checklist de coleta (trava de início)
  coleta_chaves boolean not null default false,
  coleta_documento boolean not null default false,
  coleta_foto_inicial boolean not null default false,
  coleta_confirmada_em timestamptz,
  -- Fase 5/6: dados fundamentais (hard-block de envio)
  chassi_fisico text,
  chassi_documental text,
  placa_confirmada text,
  km text,
  observacoes text,
  enviada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- itens de checklist pré-configurados (Fase 5)
create table checklist_itens (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  foto_obrigatoria boolean not null default true,
  ordem int not null default 0,
  ativo boolean not null default true
);

create table vistoria_itens (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) on delete cascade,
  checklist_item_id uuid not null references checklist_itens(id),
  condicao condicao_item,
  foto_path text, -- storage path
  marcado_em timestamptz,
  unique (vistoria_id, checklist_item_id)
);

-- ===== FASE 4: FILA DE CONSULTAS VEICULARES (assíncrona, retry) =====
create table consultas_veiculares (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) on delete cascade,
  placa text not null,
  status consulta_status not null default 'pendente',
  tentativas int not null default 0,
  max_tentativas int not null default 5,
  proximo_retry_em timestamptz not null default now(),
  provider text not null default 'mock',
  resultado jsonb,
  erro text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_consultas_fila on consultas_veiculares (status, proximo_retry_em);

-- ===== FASE 7: CONFERÊNCIA =====
create table conferencias (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) unique,
  digitadora_id uuid references profiles(id),
  ocr_chassi text,        -- resultado OCR da foto do chassi
  ocr_placa text,         -- resultado OCR da foto da placa
  alertas jsonb not null default '[]'::jsonb, -- discrepâncias detectadas automaticamente
  aprovada boolean,
  observacoes text,
  iniciada_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz not null default now()
);

-- ===== FASE 8: ENTREGAS =====
create table entregas (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) unique,
  cliente_id uuid references clientes(id),
  token_acesso text not null unique default encode(gen_random_bytes(24), 'hex'),
  status entrega_status not null default 'pendente',
  canal text not null default 'link',
  enviada_em timestamptz,
  visualizada_em timestamptz,
  expira_em timestamptz not null default now() + interval '30 days',
  created_at timestamptz not null default now()
);

-- ===== TRIGGER updated_at =====
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_agendamentos_updated before update on agendamentos for each row execute function set_updated_at();
create trigger trg_vistorias_updated before update on vistorias for each row execute function set_updated_at();
create trigger trg_consultas_updated before update on consultas_veiculares for each row execute function set_updated_at();

-- ===== HARD-BLOCK DE ENVIO (Fase 6) — defesa no banco, além da UI =====
create or replace function validar_envio_vistoria() returns trigger as $$
declare
  itens_pendentes int;
  consulta_ok int;
begin
  if new.status = 'enviada' and old.status is distinct from 'enviada' then
    if new.chassi_fisico is null or length(trim(new.chassi_fisico)) < 17 then
      raise exception 'HARD_BLOCK: chassi físico obrigatório (17 caracteres)';
    end if;
    if new.chassi_documental is null or length(trim(new.chassi_documental)) < 17 then
      raise exception 'HARD_BLOCK: chassi documental obrigatório (17 caracteres)';
    end if;
    if new.placa_confirmada is null or length(trim(new.placa_confirmada)) < 7 then
      raise exception 'HARD_BLOCK: placa confirmada obrigatória';
    end if;
    if not (new.coleta_chaves and new.coleta_documento and new.coleta_foto_inicial) then
      raise exception 'HARD_BLOCK: checklist de coleta incompleto';
    end if;
    select count(*) into itens_pendentes
      from vistoria_itens vi
      join checklist_itens ci on ci.id = vi.checklist_item_id
      where vi.vistoria_id = new.id
        and (vi.condicao is null or (ci.foto_obrigatoria and vi.foto_path is null));
    if itens_pendentes > 0 then
      raise exception 'HARD_BLOCK: % item(ns) do checklist sem condição ou sem foto obrigatória', itens_pendentes;
    end if;
    select count(*) into consulta_ok
      from consultas_veiculares
      where vistoria_id = new.id and status = 'concluida';
    if consulta_ok = 0 then
      raise exception 'HARD_BLOCK: consulta veicular ainda não concluída para esta vistoria';
    end if;
    new.enviada_em = now();
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_envio before update on vistorias for each row execute function validar_envio_vistoria();

-- ===== RLS =====
alter table profiles enable row level security;
alter table clientes enable row level security;
alter table agendamentos enable row level security;
alter table rotas enable row level security;
alter table rota_paradas enable row level security;
alter table vistorias enable row level security;
alter table checklist_itens enable row level security;
alter table vistoria_itens enable row level security;
alter table consultas_veiculares enable row level security;
alter table conferencias enable row level security;
alter table entregas enable row level security;

create or replace function current_role_of(uid uuid) returns user_role as $$
  select role from profiles where id = uid;
$$ language sql security definer stable;

-- Perfis: cada um vê o próprio; admin vê todos; todos autenticados podem listar nomes de vistoriadores
create policy "profiles_select" on profiles for select to authenticated using (true);
create policy "profiles_update_self" on profiles for update to authenticated using (id = auth.uid());
create policy "profiles_insert_self" on profiles for insert to authenticated with check (id = auth.uid());

-- Demais tabelas: acesso a autenticados (controle fino de permissões por role na aplicação;
-- endurecer políticas por role é o próximo passo antes de produção)
create policy "clientes_all" on clientes for all to authenticated using (true) with check (true);
create policy "agendamentos_all" on agendamentos for all to authenticated using (true) with check (true);
create policy "rotas_all" on rotas for all to authenticated using (true) with check (true);
create policy "rota_paradas_all" on rota_paradas for all to authenticated using (true) with check (true);
create policy "vistorias_all" on vistorias for all to authenticated using (true) with check (true);
create policy "checklist_itens_select" on checklist_itens for select to authenticated using (true);
create policy "checklist_itens_admin" on checklist_itens for all to authenticated
  using (current_role_of(auth.uid()) = 'admin') with check (current_role_of(auth.uid()) = 'admin');
create policy "vistoria_itens_all" on vistoria_itens for all to authenticated using (true) with check (true);
create policy "consultas_all" on consultas_veiculares for all to authenticated using (true) with check (true);
create policy "conferencias_all" on conferencias for all to authenticated using (true) with check (true);
create policy "entregas_all" on entregas for all to authenticated using (true) with check (true);

-- ===== STORAGE: bucket de fotos =====
insert into storage.buckets (id, name, public) values ('vistoria-fotos', 'vistoria-fotos', false)
on conflict (id) do nothing;

create policy "fotos_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'vistoria-fotos');
create policy "fotos_read" on storage.objects for select to authenticated
  using (bucket_id = 'vistoria-fotos');

-- ===== SEED: checklist padrão =====
insert into checklist_itens (nome, categoria, foto_obrigatoria, ordem) values
  ('Placa dianteira', 'Identificação', true, 1),
  ('Placa traseira', 'Identificação', true, 2),
  ('Chassi (gravação no monobloco)', 'Identificação', true, 3),
  ('Etiqueta de chassi (coluna da porta)', 'Identificação', true, 4),
  ('Motor (número/plaqueta)', 'Identificação', true, 5),
  ('Vidros (gravação)', 'Identificação', false, 6),
  ('Frente completa', 'Estrutura', true, 10),
  ('Traseira completa', 'Estrutura', true, 11),
  ('Lateral direita', 'Estrutura', true, 12),
  ('Lateral esquerda', 'Estrutura', true, 13),
  ('Longarina dianteira direita', 'Estrutura', true, 14),
  ('Longarina dianteira esquerda', 'Estrutura', true, 15),
  ('Painel/hodômetro', 'Interior', true, 20),
  ('Documento (CRLV)', 'Documentação', true, 30);
