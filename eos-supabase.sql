-- EOS CRM (Supabase) schema
-- Pega esto en Supabase: SQL Editor -> New query -> Run

create table if not exists public.eos_sellers (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  email text,
  phone text,
  zone text
);

create table if not exists public.eos_leads (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null,
  city text,
  contact text,
  phone text,
  email text,
  stage text not null default 'nuevo',
  owner_seller_id text references public.eos_sellers (id) on delete set null,
  notes text
);

create table if not exists public.eos_visits (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  seller_id text not null references public.eos_sellers (id) on delete restrict,
  lead_id text not null references public.eos_leads (id) on delete restrict,
  at timestamptz not null,
  kind text not null default 'visita',
  notes text,
  lat double precision,
  lng double precision,
  accuracy_m double precision
);

create table if not exists public.eos_activity (
  id text primary key,
  created_at timestamptz not null default now(),
  at timestamptz not null,
  type text not null,
  message text not null,
  meta jsonb not null default '{}'::jsonb
);

-- Keep updated_at fresh
create or replace function public.eos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists eos_sellers_set_updated_at on public.eos_sellers;
create trigger eos_sellers_set_updated_at
before update on public.eos_sellers
for each row execute function public.eos_set_updated_at();

drop trigger if exists eos_leads_set_updated_at on public.eos_leads;
create trigger eos_leads_set_updated_at
before update on public.eos_leads
for each row execute function public.eos_set_updated_at();

drop trigger if exists eos_visits_set_updated_at on public.eos_visits;
create trigger eos_visits_set_updated_at
before update on public.eos_visits
for each row execute function public.eos_set_updated_at();

-- RLS
-- Para MVP: políticas abiertas con anon (NO recomendado para producción).
alter table public.eos_sellers enable row level security;
alter table public.eos_leads enable row level security;
alter table public.eos_visits enable row level security;
alter table public.eos_activity enable row level security;

drop policy if exists "eos_sellers_anon_all" on public.eos_sellers;
create policy "eos_sellers_anon_all" on public.eos_sellers
for all to anon, authenticated using (true) with check (true);

drop policy if exists "eos_leads_anon_all" on public.eos_leads;
create policy "eos_leads_anon_all" on public.eos_leads
for all to anon, authenticated using (true) with check (true);

drop policy if exists "eos_visits_anon_all" on public.eos_visits;
create policy "eos_visits_anon_all" on public.eos_visits
for all to anon, authenticated using (true) with check (true);

drop policy if exists "eos_activity_anon_all" on public.eos_activity;
create policy "eos_activity_anon_all" on public.eos_activity
for all to anon, authenticated using (true) with check (true);

