-- SSO & Maintenance tables for xSyna Central
-- Run: npx supabase migration up

-- ──────────────────────────────────────────
-- Maintenance status per module
-- ──────────────────────────────────────────
create table if not exists public.maintenance_status (
  module      text primary key,
  enabled     boolean not null default false,
  message     text,
  updated_at  timestamptz not null default now()
);

comment on table public.maintenance_status is 'Wartungsmodus-Status pro Modul. __global__ = globale Wartung.';

-- Seed all known modules (disabled by default)
insert into public.maintenance_status (module, enabled, message) values
  ('__global__', false, ''),
  ('home', false, ''),
  ('worktime', false, ''),
  ('tasks', false, ''),
  ('calendar', false, ''),
  ('contacts', false, ''),
  ('chat', false, ''),
  ('vault', false, ''),
  ('workspace', false, ''),
  ('basics', false, ''),
  ('news', false, ''),
  ('docs', false, ''),
  ('apply', false, ''),
  ('teams', false, ''),
  ('security', false, ''),
  ('payments', false, ''),
  ('account', false, ''),
  ('settings', false, ''),
  ('auftrag', false, ''),
  ('admin', false, '')
on conflict (module) do nothing;

-- RLS: everyone can read, only admins can write
alter table public.maintenance_status enable row level security;

create policy "maintenance_read_all"
  on public.maintenance_status for select
  using (true);

create policy "maintenance_write_admin"
  on public.maintenance_status for all
  using (
    exists (
      select 1 from public.syn_accounts
      where slid = current_setting('app.current_slid', true)
      and kind = 'superuser'
    )
  );

-- ──────────────────────────────────────────
-- SSO: OAuth states (temporary, expires)
-- ──────────────────────────────────────────
create table if not exists public.sso_states (
  state        text primary key,
  provider     text not null,
  redirect_uri text not null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists idx_sso_states_expires
  on public.sso_states(expires_at);

-- Auto-cleanup expired states
select cron.schedule('cleanup-sso-states', '*/5 * * * *',
  $$ delete from public.sso_states where expires_at < now() $$);

-- ──────────────────────────────────────────
-- SSO: Registered client applications
-- ──────────────────────────────────────────
create table if not exists public.sso_clients (
  id           uuid primary key default gen_random_uuid(),
  client_id    text not null unique,
  client_secret_hash text not null,
  name         text not null,
  logo_url     text,
  description  text,
  redirect_uris text[] not null default '{}',
  allowed_scopes text[] not null default '{profile,email}',
  owner_slid   text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- Seed a demo client for SSO.xsyna.de
insert into public.sso_clients (client_id, client_secret_hash, name, description, redirect_uris, allowed_scopes)
values (
  'xsyna-sso-hub',
  'placeholder-hash',
  'xSyna SSO Hub',
  'Zentrale SSO-Anmeldung für xSyna-Dienste',
  array['https://sso.xsyna.de/callback'],
  array['profile', 'email', 'openid']
)
on conflict (client_id) do nothing;

-- ──────────────────────────────────────────
-- SSO: Authorization codes (temporary)
-- ──────────────────────────────────────────
create table if not exists public.sso_codes (
  code         text primary key,
  state        text not null references public.sso_states(state) on delete cascade,
  client_id    text not null,
  slid         text not null,
  scopes       text[] not null default '{}',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '5 minutes')
);

create index if not exists idx_sso_codes_expires
  on public.sso_codes(expires_at);

-- ──────────────────────────────────────────
-- SSO: Connected accounts (linking)
-- ──────────────────────────────────────────
create table if not exists public.sso_accounts (
  id               uuid primary key default gen_random_uuid(),
  slid             text not null references public.syn_accounts(slid) on delete cascade,
  provider         text not null,
  provider_account_id text not null,
  username         text,
  email            text,
  avatar_url       text,
  access_token     text,
  refresh_token    text,
  token_expires_at timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique(slid, provider, provider_account_id)
);

create index if not exists idx_sso_accounts_slid
  on public.sso_accounts(slid);

create index if not exists idx_sso_accounts_provider
  on public.sso_accounts(provider, provider_account_id);

-- RLS: users can only see their own connected accounts
alter table public.sso_accounts enable row level security;

create policy "sso_accounts_own"
  on public.sso_accounts for select
  using (slid = current_setting('app.current_slid', true));

create policy "sso_accounts_admin"
  on public.sso_accounts for all
  using (
    exists (
      select 1 from public.syn_accounts
      where slid = current_setting('app.current_slid', true)
      and kind = 'superuser'
    )
  );

-- ──────────────────────────────────────────
-- SSO: Audit log
-- ──────────────────────────────────────────
create table if not exists public.sso_audit (
  id         uuid primary key default gen_random_uuid(),
  slid       text,
  provider   text not null,
  action     text not null,
  details    jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_sso_audit_slid
  on public.sso_audit(slid, created_at desc);

-- ──────────────────────────────────────────
-- Add github_id to syn_accounts for OAuth linking
-- ──────────────────────────────────────────
alter table public.syn_accounts
  add column if not exists github_id text unique,
  add column if not exists github_username text,
  add column if not exists github_avatar text;

-- ──────────────────────────────────────────
-- Add maintenance feature to employee_roles
-- ──────────────────────────────────────────
insert into public.employee_roles (slid, features)
select slid, features || '{maintenance.manage}'::text[]
from public.employee_roles
where kind = 'superuser'
  and not (features @> '{maintenance.manage}')
on conflict do nothing;
