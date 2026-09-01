-- Fase 3: foto inicial da coleta com trava real (upload obrigatório, não checkbox)
alter table vistorias add column if not exists coleta_foto_path text;
