-- Make live_contest and competitions readable by anyone (anonymous visitors)
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mfshfhpctymtuyvayidb/sql/new

-- ── live_contest ──────────────────────────────────────────────────────────────
-- Create table if it was never formally migrated
create table if not exists live_contest (
  id               text primary key,
  run_id           text,
  contest_name     text,
  type_name        text,
  players          jsonb,
  team_assignments jsonb,
  updated_at       timestamptz default now()
);

alter table live_contest enable row level security;

-- Public: anyone can read the live results
drop policy if exists "public_read"  on live_contest;
create policy "public_read"  on live_contest for select using (true);

-- Authenticated writers (anon key suffices for our admin model)
drop policy if exists "public_write" on live_contest;
create policy "public_write" on live_contest for all using (true) with check (true);

-- Enable realtime so the page receives push updates without polling
alter publication supabase_realtime add table live_contest;

-- ── competitions ──────────────────────────────────────────────────────────────
alter table competitions enable row level security;

drop policy if exists "public_all" on competitions;
create policy "public_all" on competitions for all using (true) with check (true);
