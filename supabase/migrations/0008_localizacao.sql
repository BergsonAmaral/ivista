-- Localização ao vivo do vistoriador (enviada pelo celular durante o expediente)
alter table profiles add column if not exists ultima_lat double precision;
alter table profiles add column if not exists ultima_lng double precision;
alter table profiles add column if not exists localizacao_em timestamptz;
