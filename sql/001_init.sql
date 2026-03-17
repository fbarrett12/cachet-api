create extension if not exists pgcrypto;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists sportsbooks (
  id serial primary key,
  slug text unique not null,
  name text not null
);

insert into sportsbooks (slug, name)
values
  ('draftkings', 'DraftKings'),
  ('fanduel', 'FanDuel')
on conflict (slug) do nothing;

create table if not exists bet_imports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  sportsbook_id int references sportsbooks(id),
  source_type text not null,
  source_url text not null,
  raw_html text,
  raw_payload jsonb,
  parse_status text not null default 'pending',
  error_message text,
  parser_version text,
  created_at timestamptz not null default now()
);

create table if not exists bets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  sportsbook_id int references sportsbooks(id),
  bet_import_id uuid references bet_imports(id),
  external_share_id text,
  bet_type text not null default 'unknown',
  status text not null default 'pending',
  placed_at timestamptz,
  event_start_at timestamptz,
  stake_cents int,
  to_win_cents int,
  payout_cents int,
  odds_american int,
  odds_decimal numeric(8,3),
  is_user_confirmed boolean not null default false,
  placed_confirmed_at timestamptz,
  graded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists bet_legs (
  id uuid primary key default gen_random_uuid(),
  bet_id uuid not null references bets(id) on delete cascade,
  sport text,
  league text,
  event_name text,
  market_type text,
  market_subtype text,
  selection_type text,
  player_name text,
  team_name text,
  opponent_name text,
  line_value numeric(8,2),
  odds_american int,
  result text not null default 'pending',
  stat_value numeric(8,2),
  starts_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_bets_user_created_at
  on bets(user_id, created_at desc);

create index if not exists idx_bet_legs_player_name
  on bet_legs(player_name);

create index if not exists idx_bet_legs_market_subtype
  on bet_legs(market_subtype);