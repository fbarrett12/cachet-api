insert into sports (name, slug)
values
  ('Basketball', 'basketball'),
  ('Baseball', 'baseball'),
  ('Football', 'football')
on conflict (slug) do nothing;

insert into leagues (sport_id, name, slug)
select s.id, 'NBA', 'nba'
from sports s
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into leagues (sport_id, name, slug)
select s.id, 'WNBA', 'wnba'
from sports s
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into leagues (sport_id, name, slug)
select s.id, 'MLB', 'mlb'
from sports s
where s.slug = 'baseball'
on conflict (slug) do nothing;

insert into markets (sport_id, league_id, name, slug, market_type)
select s.id, l.id, 'Moneyline', 'nba-moneyline', 'game'
from sports s
join leagues l on l.slug = 'nba'
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into markets (sport_id, league_id, name, slug, market_type)
select s.id, l.id, 'Points', 'nba-points', 'player_prop'
from sports s
join leagues l on l.slug = 'nba'
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into markets (sport_id, league_id, name, slug, market_type)
select s.id, l.id, 'Assists', 'nba-assists', 'player_prop'
from sports s
join leagues l on l.slug = 'nba'
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into markets (sport_id, league_id, name, slug, market_type)
select s.id, l.id, 'Rebounds', 'nba-rebounds', 'player_prop'
from sports s
join leagues l on l.slug = 'nba'
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into markets (sport_id, league_id, name, slug, market_type)
select s.id, l.id, 'Points + Rebounds + Assists', 'wnba-pra', 'player_prop'
from sports s
join leagues l on l.slug = 'wnba'
where s.slug = 'basketball'
on conflict (slug) do nothing;

insert into markets (sport_id, league_id, name, slug, market_type)
select s.id, l.id, 'Hits + Runs + RBIs', 'mlb-hrrbi', 'player_prop'
from sports s
join leagues l on l.slug = 'mlb'
where s.slug = 'baseball'
on conflict (slug) do nothing;