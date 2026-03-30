-- ============================================================
-- EOS CRM v2 — Supabase Schema
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Extensiones
create extension if not exists "uuid-ossp";

-- ── Companies (Colegios) ─────────────────────────────────────
create table if not exists public.crm_companies (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  name          text not null,
  address       text,
  city          text,
  country       text not null default 'El Salvador',
  lat           double precision,
  lng           double precision,
  student_count integer,
  -- prospect | active | lost | inactive
  status        text not null default 'prospect',
  website       text,
  notes         text,
  owner_id      uuid references auth.users(id) on delete set null
);

create index if not exists crm_companies_status_idx on public.crm_companies(status);
create index if not exists crm_companies_name_idx on public.crm_companies using gin(to_tsvector('spanish', name));

-- ── Contacts ─────────────────────────────────────────────────
create table if not exists public.crm_contacts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  company_id  uuid not null references public.crm_companies(id) on delete cascade,
  name        text not null,
  -- director | rector | coordinador | jefe_sistemas | jefe_admin | contador | otro
  role        text,
  email       text,
  phone       text,
  is_primary  boolean not null default false,
  notes       text
);

create index if not exists crm_contacts_company_idx on public.crm_contacts(company_id);

-- ── Opportunities (Pipeline) ──────────────────────────────────
create table if not exists public.crm_opportunities (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  company_id           uuid not null references public.crm_companies(id) on delete cascade,
  contact_id           uuid references public.crm_contacts(id) on delete set null,
  title                text not null,
  -- lead | contacto | demo_agendada | demo_realizada | propuesta | negociacion | ganado | perdido
  stage                text not null default 'lead',
  value                numeric(14, 2),
  -- mensual | anual
  billing_cycle        text not null default 'mensual',
  probability          smallint not null default 5 check (probability between 0 and 100),
  expected_close_date  date,
  lost_reason          text,
  notes                text,
  owner_id             uuid references auth.users(id) on delete set null,
  -- ERP sync tracking
  erp_synced           boolean not null default false,
  erp_synced_at        timestamptz
);

create index if not exists crm_opps_company_idx  on public.crm_opportunities(company_id);
create index if not exists crm_opps_stage_idx    on public.crm_opportunities(stage);
create index if not exists crm_opps_owner_idx    on public.crm_opportunities(owner_id);

-- ── Activities ─────────────────────────────────────────────────
create table if not exists public.crm_activities (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  company_id       uuid references public.crm_companies(id) on delete cascade,
  opportunity_id   uuid references public.crm_opportunities(id) on delete cascade,
  -- llamada | visita | demo | email | tarea | nota
  type             text not null,
  subject          text not null,
  notes            text,
  scheduled_at     timestamptz,
  completed_at     timestamptz,
  -- GPS coordinates for visit check-ins
  lat              double precision,
  lng              double precision,
  user_id          uuid references auth.users(id) on delete set null
);

create index if not exists crm_activities_company_idx  on public.crm_activities(company_id);
create index if not exists crm_activities_opp_idx      on public.crm_activities(opportunity_id);
create index if not exists crm_activities_created_idx  on public.crm_activities(created_at desc);

-- ── User Profiles ─────────────────────────────────────────────
create table if not exists public.crm_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  full_name   text,
  email       text,
  avatar_url  text,
  -- admin | seller
  role        text not null default 'seller',
  zone        text,
  phone       text,
  -- Real-time GPS tracking
  last_lat    double precision,
  last_lng    double precision,
  last_seen   timestamptz
);

-- ── Trigger: updated_at ───────────────────────────────────────
create or replace function public.crm_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$ declare
  t text;
begin
  foreach t in array array['crm_companies','crm_contacts','crm_opportunities','crm_profiles']
  loop
    execute format('
      drop trigger if exists %I_updated_at on public.%I;
      create trigger %I_updated_at
      before update on public.%I
      for each row execute function public.crm_set_updated_at();
    ', t, t, t, t);
  end loop;
end $$;

-- ── Row Level Security ────────────────────────────────────────
alter table public.crm_companies    enable row level security;
alter table public.crm_contacts     enable row level security;
alter table public.crm_opportunities enable row level security;
alter table public.crm_activities   enable row level security;
alter table public.crm_profiles     enable row level security;

-- MVP: authenticated users can read/write everything in their org.
-- In production: add org_id columns and filter by auth.uid().

do $$ declare
  tbl text;
begin
  foreach tbl in array array['crm_companies','crm_contacts','crm_opportunities','crm_activities']
  loop
    execute format('
      drop policy if exists "%s_auth_all" on public.%s;
      create policy "%s_auth_all" on public.%s
      for all to authenticated using (true) with check (true);
    ', tbl, tbl, tbl, tbl);
  end loop;
end $$;

-- Profiles: all team members can read all profiles (needed for Team page + map)
-- Any authenticated user can update any profile (allows admin to change roles)
drop policy if exists "crm_profiles_self" on public.crm_profiles;
drop policy if exists "crm_profiles_read" on public.crm_profiles;
drop policy if exists "crm_profiles_write" on public.crm_profiles;
create policy "crm_profiles_read" on public.crm_profiles
  for select to authenticated using (true);
create policy "crm_profiles_write" on public.crm_profiles
  for all to authenticated using (true) with check (true);

-- ── Auto-create profile on new user ──────────────────────────
create or replace function public.crm_handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.crm_profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'seller')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists crm_on_auth_user_created on auth.users;
create trigger crm_on_auth_user_created
after insert on auth.users
for each row execute function public.crm_handle_new_user();
