alter table users
add column if not exists password_hash text,
add column if not exists display_name text,
add column if not exists auth_provider text not null default 'password',
add column if not exists google_sub text unique,
add column if not exists avatar_url text,
add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_users_email
  on users(email);