-- Add is_sm flag to competitions and gp_results tables
-- Run in Supabase SQL Editor: https://supabase.com/dashboard/project/mfshfhpctymtuyvayidb/sql/new

alter table competitions
  add column if not exists is_sm boolean not null default false;

alter table gp_results
  add column if not exists is_sm boolean not null default false;
