create table if not exists contest_results (
    id           uuid        primary key default gen_random_uuid(),
    run_id       text        not null,
    contest_name text        not null,
    type_name    text        not null,
    club_id      text        not null,
    players      jsonb       not null default '[]',
    team_assignments jsonb   not null default '[]',
    completed_at timestamptz not null default now()
);

alter table contest_results enable row level security;

create policy "public_all" on contest_results
    for all using (true) with check (true);
