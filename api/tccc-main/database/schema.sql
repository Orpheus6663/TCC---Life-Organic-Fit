-- Life Organic Fit: tabelas e políticas para o cliente Supabase.
-- Execute no SQL Editor do projeto Supabase antes de usar os registros.

create table if not exists public.questionnaires (
  user_id uuid primary key references auth.users (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  calories integer check (calories is null or calories >= 0),
  consumed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.water_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml integer not null check (amount_ml between 1 and 5000),
  created_at timestamptz not null default now()
);

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.questionnaires, public.meals, public.water_logs to authenticated;

create index if not exists meals_user_consumed_idx on public.meals (user_id, consumed_at);
create index if not exists water_logs_user_created_idx on public.water_logs (user_id, created_at);

alter table public.questionnaires enable row level security;
alter table public.meals enable row level security;
alter table public.water_logs enable row level security;

drop policy if exists "Users manage their questionnaire" on public.questionnaires;
create policy "Users manage their questionnaire" on public.questionnaires
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their meals" on public.meals;
create policy "Users manage their meals" on public.meals
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage their water logs" on public.water_logs;
create policy "Users manage their water logs" on public.water_logs
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
