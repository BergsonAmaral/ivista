-- Governança de equipe: admin pode editar qualquer perfil (função e ativo)
create policy "profiles_admin_update" on profiles for update to authenticated
  using (current_role_of(auth.uid()) = 'admin')
  with check (current_role_of(auth.uid()) = 'admin');

-- Novos cadastros entram sem privilégio: o trigger passa a ignorar o role dos
-- metadados e todo novo usuário começa como 'atendente' até o admin definir.
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
