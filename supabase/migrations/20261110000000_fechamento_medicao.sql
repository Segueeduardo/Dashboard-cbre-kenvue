-- Fechamento de medição de faturamento (Orçado x Real por UT)
-- Guarda o último fechamento publicado pela tela "Importar dados".
-- Uma única linha (id = 1): cada nova planilha substitui a anterior.

create table if not exists public.fechamento_medicao (
  id         integer     primary key default 1 check (id = 1),
  payload    jsonb       not null,
  updated_at timestamptz not null default now()
);

comment on table public.fechamento_medicao is
  'Último fechamento de medição publicado. payload = { aba, periodo, metaMB, total, uts[] }';

alter table public.fechamento_medicao enable row level security;

-- Leitura: qualquer visitante do dashboard (o painel é somente leitura sem login)
drop policy if exists "fechamento_leitura_publica" on public.fechamento_medicao;
create policy "fechamento_leitura_publica"
  on public.fechamento_medicao for select
  to anon, authenticated
  using (true);

-- Escrita: somente usuários logados (tela Importar dados)
drop policy if exists "fechamento_insert_autenticado" on public.fechamento_medicao;
create policy "fechamento_insert_autenticado"
  on public.fechamento_medicao for insert
  to authenticated
  with check (true);

drop policy if exists "fechamento_update_autenticado" on public.fechamento_medicao;
create policy "fechamento_update_autenticado"
  on public.fechamento_medicao for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "fechamento_delete_autenticado" on public.fechamento_medicao;
create policy "fechamento_delete_autenticado"
  on public.fechamento_medicao for delete
  to authenticated
  using (true);
