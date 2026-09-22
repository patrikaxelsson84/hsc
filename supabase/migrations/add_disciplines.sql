-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mfshfhpctymtuyvayidb/sql/new

alter table competitions
  add column if not exists disciplines text[];
