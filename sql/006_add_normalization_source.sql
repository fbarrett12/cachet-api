alter table bet_legs
add column if not exists raw_market_subtype text,
add column if not exists normalization_version text;