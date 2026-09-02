-- Fase 2: base do vistoriador (casa/ponto de partida) para sugestão de rota por proximidade
alter table profiles add column if not exists endereco_base text;
alter table profiles add column if not exists base_lat double precision;
alter table profiles add column if not exists base_lng double precision;
