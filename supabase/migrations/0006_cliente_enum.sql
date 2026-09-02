-- Novo perfil: cliente (empresa parceira que agenda pelo portal)
-- IMPORTANTE: rodar este arquivo SOZINHO, antes do 0007 (limitação do Postgres com enums)
alter type user_role add value if not exists 'cliente';
