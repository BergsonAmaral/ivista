# VISTA — Gestão de Vistorias Automotivas

Sistema operacional completo para o fluxo de vistorias veiculares em 8 fases, eliminando os
gargalos mapeados no briefing de Operações & TI:

| Fase | Módulo | Gargalo resolvido |
|------|--------|-------------------|
| 1. Agendamento | Agenda unificada | Canais fragmentados → entrada única com anti-duplicidade |
| 2. Roteirização | Rotas do dia | Planejamento manual → atribuição com tempo por complexidade |
| 3. Coleta | Checklist de chegada | Dependência de memória → trava de chaves/documento/foto |
| 4. Consulta | Fila assíncrona | Webservice instável → retry automático c/ backoff, sem ociosidade |
| 5. Vistoria | Wizard passo a passo | Marcação incorreta → foto obrigatória por componente |
| 6. Envio | Hard-block (UI + trigger no banco) | Laudos com campos em branco → envio bloqueado |
| 7. Conferência | Auditoria assistida | Cruzamento manual → alertas automáticos de divergência |
| 8. Entrega | Link seguro | Disparo manual → entrega gerada na aprovação, com rastreio de visualização |

**Stack:** Next.js (App Router) · Supabase (Postgres + Auth + Storage) · Vercel (deploy + cron).

## Configuração — passo a passo

### 1. Supabase
1. No painel do seu projeto Supabase, abra **SQL Editor** e execute o conteúdo de
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql).
2. Em **Authentication → Providers → Email**, desative "Confirm email" (ou configure SMTP)
   para permitir cadastro direto no MVP.

### 2. Ambiente local
```bash
cp .env.local.example .env.local
```
Preencha com os valores de **Project Settings → API** do Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secreta — nunca commitar)
- `CRON_SECRET` (qualquer string aleatória)

```bash
npm install
npm run dev
```

### 3. Primeiro uso
1. Acesse `/login` → "Criar nova conta". Crie ao menos:
   - 1 **atendente** (agenda), 1 **vistoriador** (campo), 1 **digitadora** (conferência).
2. Cadastre um cliente em **Clientes**.
3. Crie um agendamento (Fase 1) → atribua na tela **Rotas** (Fase 2) → a vistoria aparece
   para o vistoriador em **Vistorias** (Fases 3–6) → aprove em **Conferência** (Fase 7) →
   copie o link seguro em **Entregas** (Fase 8).

### 4. Deploy na Vercel
1. Suba o repositório para o GitHub e importe na Vercel.
2. Configure as 4 variáveis de ambiente do `.env.local.example`.
3. O `vercel.json` já agenda o cron de 1 min que processa a fila de consultas (Fase 4).

## Integrações plugáveis (mocks incluídos)
- **Consulta veicular** — `src/lib/providers/vehicle-query.ts`: implemente `VehicleQueryProvider`
  com o provedor real (o mock simula latência e ~30% de falha para exercitar o retry).
- **OCR de chassi/placa** — `src/lib/providers/ocr.ts` (Fase 7).

## Antes de produção
- Endurecer as políticas RLS por role (hoje: acesso amplo a usuários autenticados).
- Restringir o cadastro público de usuários (hoje aberto para facilitar o MVP).
- Conectar provedor real de consulta veicular e OCR.
