create table if not exists bet_leg_groups (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id) on delete cascade,
  group_type text not null,
  label text,
  event_name text,
  leg_order int,
  created_at timestamptz not null default now()
);

alter table bet_legs
add column if not exists bet_leg_group_id uuid references bet_leg_groups(id),
add column if not exists parent_external_id text,
add column if not exists leg_order int;

create index if not exists idx_bet_leg_groups_bet_id
  on bet_leg_groups(bet_id);

create index if not exists idx_bet_legs_group_id
  on bet_legs(bet_leg_group_id);