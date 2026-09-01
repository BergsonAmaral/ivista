-- Cria o perfil automaticamente quando um usuário se cadastra (padrão Supabase).
-- Usa os metadados enviados no signup (nome, role).
create or replace function public.handle_new_user() returns trigger
security definer set search_path = public
language plpgsql as $$
begin
  insert into public.profiles (id, nome, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'atendente')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Corrige usuários já criados sem perfil
insert into public.profiles (id, nome, role)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'nome', split_part(u.email, '@', 1)),
  coalesce((u.raw_user_meta_data->>'role')::public.user_role, 'atendente')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
