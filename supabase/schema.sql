-- HSC Supabase schema
-- Run this once in the SQL Editor at:
-- https://supabase.com/dashboard/project/mfshfhpctymtuyvayidb/sql/new

-- ── Credentials (admin + club passwords) ─────────────────────────────────────
create table if not exists credentials (
  id          text primary key,
  type        text not null,
  password    text not null,
  created_at  timestamptz default now()
);

-- ── Registrations ─────────────────────────────────────────────────────────────
create table if not exists registrations (
  id             uuid primary key default gen_random_uuid(),
  competition_id text,
  first_name     text not null,
  last_name      text not null,
  club           text not null,
  category       text not null,
  title          text,
  pair_with      text,
  team_id        text,
  created_at     timestamptz default now()
);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table credentials    enable row level security;
alter table registrations  enable row level security;

-- Public access (client-side auth model – passwords checked in the browser)
create policy "public_all" on credentials   for all using (true) with check (true);
create policy "public_all" on registrations for all using (true) with check (true);

-- ── Seed admin credential ─────────────────────────────────────────────────────
insert into credentials (id, type, password)
values ('admin', 'admin', 'admin')
on conflict (id) do nothing;
