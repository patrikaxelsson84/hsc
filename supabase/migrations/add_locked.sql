-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mfshfhpctymtuyvayidb/sql/new

alter table competitions
  add column if not exists locked boolean default false,
  add column if not exists unlock_requested boolean default false;
