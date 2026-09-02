-- Portal do cliente: vínculo usuário→empresa e políticas de acesso.
-- Rodar DEPOIS do 0006 (em execução separada).

alter table profiles add column if not exists cliente_id uuid references clientes(id);

-- staff = qualquer função interna (não-cliente)
create or replace function is_staff(uid uuid) returns boolean as $$
  select coalesce((select role from profiles where id = uid) <> 'cliente', false);
$$ language sql security definer stable;

create or replace function my_cliente_id(uid uuid) returns uuid as $$
  select cliente_id from profiles where id = uid;
$$ language sql security definer stable;

-- Perfis: cliente só vê o próprio
drop policy if exists "profiles_select" on profiles;
create policy "profiles_select" on profiles for select to authenticated
  using (is_staff(auth.uid()) or id = auth.uid());

-- Tabelas internas: apenas staff
drop policy if exists "rotas_all" on rotas;
create policy "rotas_all" on rotas for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists "rota_paradas_all" on rota_paradas;
create policy "rota_paradas_all" on rota_paradas for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists "vistorias_all" on vistorias;
create policy "vistorias_all" on vistorias for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists "vistoria_itens_all" on vistoria_itens;
create policy "vistoria_itens_all" on vistoria_itens for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists "consultas_all" on consultas_veiculares;
create policy "consultas_all" on consultas_veiculares for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists "conferencias_all" on conferencias;
create policy "conferencias_all" on conferencias for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

-- Clientes: staff tudo; cliente vê a própria empresa
drop policy if exists "clientes_all" on clientes;
create policy "clientes_staff" on clientes for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "clientes_self" on clientes for select to authenticated
  using (id = my_cliente_id(auth.uid()));

-- Agendamentos: staff tudo; cliente cria e acompanha os seus
drop policy if exists "agendamentos_all" on agendamentos;
create policy "agendamentos_staff" on agendamentos for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "agendamentos_cliente_select" on agendamentos for select to authenticated
  using (cliente_id = my_cliente_id(auth.uid()));
create policy "agendamentos_cliente_insert" on agendamentos for insert to authenticated
  with check (cliente_id = my_cliente_id(auth.uid()) and status = 'solicitado');

-- Entregas: staff tudo; cliente vê as suas (para abrir o laudo)
drop policy if exists "entregas_all" on entregas;
create policy "entregas_staff" on entregas for all to authenticated
  using (is_staff(auth.uid())) with check (is_staff(auth.uid()));
create policy "entregas_cliente_select" on entregas for select to authenticated
  using (cliente_id = my_cliente_id(auth.uid()));

-- Fotos: apenas staff acessa o bucket direto (cliente vê pelo link do laudo)
drop policy if exists "fotos_upload" on storage.objects;
drop policy if exists "fotos_read" on storage.objects;
create policy "fotos_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'vistoria-fotos' and is_staff(auth.uid()));
create policy "fotos_read" on storage.objects for select to authenticated
  using (bucket_id = 'vistoria-fotos' and is_staff(auth.uid()));
