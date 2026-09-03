-- ============================================================
-- SUPER VISÃO FORTALEZA — setup completo do banco
-- Consolida as migrações 0001–0008 + políticas finais.
-- REEXECUTÁVEL: apaga e recria tudo (não rodar num banco com dados!)
-- ============================================================

-- ===== RESET (permite rodar de novo do zero) =====
drop table if exists entregas cascade;
drop table if exists conferencias cascade;
drop table if exists vistoria_itens cascade;
drop table if exists consultas_veiculares cascade;
drop table if exists checklist_itens cascade;
drop table if exists vistorias cascade;
drop table if exists rota_paradas cascade;
drop table if exists rotas cascade;
drop table if exists agendamentos cascade;
drop table if exists profiles cascade;
drop table if exists clientes cascade;
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user() cascade;
drop function if exists validar_envio_vistoria() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists current_role_of(uuid) cascade;
drop function if exists is_staff(uuid) cascade;
drop function if exists my_cliente_id(uuid) cascade;
drop policy if exists "fotos_upload" on storage.objects;
drop policy if exists "fotos_read" on storage.objects;
drop type if exists user_role cascade;
drop type if exists canal_entrada cascade;
drop type if exists agendamento_status cascade;
drop type if exists complexidade_veiculo cascade;
drop type if exists vistoria_status cascade;
drop type if exists consulta_status cascade;
drop type if exists condicao_item cascade;
drop type if exists entrega_status cascade;

-- ===== ENUMS =====
create type user_role as enum ('admin', 'atendente', 'vistoriador', 'digitadora', 'cliente');
create type canal_entrada as enum ('telefone', 'whatsapp', 'whatsapp_grupo', 'portal', 'manual');
create type agendamento_status as enum ('solicitado', 'confirmado', 'roteirizado', 'em_andamento', 'concluido', 'cancelado');
create type complexidade_veiculo as enum ('baixa', 'media', 'alta');
create type vistoria_status as enum ('aguardando', 'coleta', 'em_vistoria', 'enviada', 'em_conferencia', 'aprovada', 'entregue', 'rejeitada');
create type consulta_status as enum ('pendente', 'processando', 'concluida', 'falha', 'cancelada');
create type condicao_item as enum ('bom', 'regular', 'danificado', 'ausente', 'nao_aplicavel');
create type entrega_status as enum ('pendente', 'enviada', 'visualizada');

-- ===== TABELAS =====
create table clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  email text,
  telefone text,
  whatsapp text,
  created_at timestamptz not null default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role user_role not null default 'atendente',
  telefone text,
  ativo boolean not null default true,
  cliente_id uuid references clientes(id),
  endereco_base text,
  base_lat double precision,
  base_lng double precision,
  ultima_lat double precision,
  ultima_lng double precision,
  localizacao_em timestamptz,
  created_at timestamptz not null default now()
);

create table agendamentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id),
  canal canal_entrada not null default 'manual',
  status agendamento_status not null default 'solicitado',
  placa text,
  modelo text,
  marca text,
  ano text,
  complexidade complexidade_veiculo not null default 'media',
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
create index idx_agendamentos_placa_data on agendamentos (placa, data_agendada);
create index idx_agendamentos_status on agendamentos (status);

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
  tempo_estimado_min int not null default 60,
  hora_prevista time,
  unique (rota_id, ordem),
  unique (agendamento_id)
);

create table vistorias (
  id uuid primary key default gen_random_uuid(),
  agendamento_id uuid not null references agendamentos(id) unique,
  vistoriador_id uuid references profiles(id),
  status vistoria_status not null default 'aguardando',
  coleta_chaves boolean not null default false,
  coleta_documento boolean not null default false,
  coleta_foto_inicial boolean not null default false,
  coleta_foto_path text,
  coleta_confirmada_em timestamptz,
  chassi_fisico text,
  chassi_documental text,
  placa_confirmada text,
  km text,
  observacoes text,
  enviada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  foto_path text,
  marcado_em timestamptz,
  unique (vistoria_id, checklist_item_id)
);

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

create table conferencias (
  id uuid primary key default gen_random_uuid(),
  vistoria_id uuid not null references vistorias(id) unique,
  digitadora_id uuid references profiles(id),
  ocr_chassi text,
  ocr_placa text,
  alertas jsonb not null default '[]'::jsonb,
  aprovada boolean,
  observacoes text,
  iniciada_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz not null default now()
);

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

-- ===== TRIGGERS =====
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_agendamentos_updated before update on agendamentos for each row execute function set_updated_at();
create trigger trg_vistorias_updated before update on vistorias for each row execute function set_updated_at();
create trigger trg_consultas_updated before update on consultas_veiculares for each row execute function set_updated_at();

-- Perfil automático no cadastro (todo novo usuário nasce 'atendente')
create or replace function public.handle_new_user() returns trigger
security definer set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    'atendente'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Hard-block de envio do laudo (defesa no banco, além da interface)
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

-- ===== FUNÇÕES DE APOIO ÀS POLÍTICAS =====
create or replace function current_role_of(uid uuid) returns user_role as $$
  select role from profiles where id = uid;
$$ language sql security definer stable;

create or replace function is_staff(uid uuid) returns boolean as $$
  select coalesce((select role from profiles where id = uid) <> 'cliente', false);
$$ language sql security definer stable;

create or replace function my_cliente_id(uid uuid) returns uuid as $$
  select cliente_id from profiles where id = uid;
$$ language sql security definer stable;

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

-- perfis
create policy "profiles_select" on profiles for select to authenticated
  using (is_staff(auth.uid()) or id = auth.uid());
create policy "profiles_update_self" on profiles for update to authenticated using (id = auth.uid());
create policy "profiles_insert_self" on profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles_admin_update" on profiles for update to authenticated
  using (current_role_of(auth.uid()) = 'admin')
  with check (current_role_of(auth.uid()) = 'admin');

-- tabelas internas: apenas staff
create policy "rotas_all" on rotas for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "rota_paradas_all" on rota_paradas for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "vistorias_all" on vistorias for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "vistoria_itens_all" on vistoria_itens for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "consultas_all" on consultas_veiculares for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "conferencias_all" on conferencias for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- checklist: leitura para staff; edição só admin
create policy "checklist_itens_select" on checklist_itens for select to authenticated using (true);
create policy "checklist_itens_admin" on checklist_itens for all to authenticated
  using (current_role_of(auth.uid()) = 'admin') with check (current_role_of(auth.uid()) = 'admin');

-- clientes: staff tudo; cliente vê a própria empresa
create policy "clientes_staff" on clientes for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "clientes_self" on clientes for select to authenticated
  using (id = my_cliente_id(auth.uid()));

-- agendamentos: staff tudo; cliente cria e acompanha os seus
create policy "agendamentos_staff" on agendamentos for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "agendamentos_cliente_select" on agendamentos for select to authenticated
  using (cliente_id = my_cliente_id(auth.uid()));
create policy "agendamentos_cliente_insert" on agendamentos for insert to authenticated
  with check (cliente_id = my_cliente_id(auth.uid()) and status = 'solicitado');

-- vistorias visíveis ao cliente dono do agendamento (para a placa nos laudos)
create policy "vistorias_cliente_select" on vistorias for select to authenticated
  using (exists (select 1 from agendamentos a
                 where a.id = vistorias.agendamento_id
                   and a.cliente_id = my_cliente_id(auth.uid())));

-- entregas: staff tudo; cliente vê as suas
create policy "entregas_staff" on entregas for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "entregas_cliente_select" on entregas for select to authenticated
  using (cliente_id = my_cliente_id(auth.uid()));

-- ===== STORAGE =====
insert into storage.buckets (id, name, public) values ('vistoria-fotos', 'vistoria-fotos', false)
on conflict (id) do nothing;

create policy "fotos_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'vistoria-fotos' and is_staff(auth.uid()));
create policy "fotos_read" on storage.objects for select to authenticated
  using (bucket_id = 'vistoria-fotos' and is_staff(auth.uid()));

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
