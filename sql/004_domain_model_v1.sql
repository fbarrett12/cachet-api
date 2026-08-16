create table if not exists sports (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists leagues (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references sports(id),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id),
  name text not null,
  abbreviation text,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id),
  current_team_id uuid references teams(id),
  display_name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  league_id uuid references leagues(id),
  home_team_id uuid references teams(id),
  away_team_id uuid references teams(id),
  name text not null,
  starts_at timestamptz,
  external_event_id text,
  created_at timestamptz not null default now()
);

create table if not exists markets (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid references sports(id),
  league_id uuid references leagues(id),
  name text not null,
  slug text not null unique,
  market_type text,
  created_at timestamptz not null default now()
);

alter table bet_legs
add column if not exists canonical_sport_id uuid references sports(id),
add column if not exists canonical_league_id uuid references leagues(id),
add column if not exists canonical_team_id uuid references teams(id),
add column if not exists canonical_opponent_team_id uuid references teams(id),
add column if not exists canonical_player_id uuid references players(id),
add column if not exists canonical_event_id uuid references events(id),
add column if not exists canonical_market_id uuid references markets(id);

create index if not exists idx_leagues_sport_id on leagues(sport_id);
create index if not exists idx_teams_league_id on teams(league_id);
create index if not exists idx_players_league_id on players(league_id);
create index if not exists idx_players_current_team_id on players(current_team_id);
create index if not exists idx_events_league_id on events(league_id);
create index if not exists idx_events_external_event_id on events(external_event_id);
create index if not exists idx_markets_league_id on markets(league_id);

create index if not exists idx_bet_legs_canonical_player_id
  on bet_legs(canonical_player_id);

create index if not exists idx_bet_legs_canonical_team_id
  on bet_legs(canonical_team_id);

create index if not exists idx_bet_legs_canonical_league_id
  on bet_legs(canonical_league_id);

create index if not exists idx_bet_legs_canonical_market_id
  on bet_legs(canonical_market_id);

create index if not exists idx_bet_legs_canonical_event_id
  on bet_legs(canonical_event_id);