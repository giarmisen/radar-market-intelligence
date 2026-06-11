-- Gmail OAuth refresh token storage (persists across deploys)
create table if not exists gmail_tokens (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  refresh_token text not null,
  updated_at timestamptz default now()
);

alter table gmail_tokens disable row level security;

grant all on table gmail_tokens to anon, authenticated, service_role;

-- Add gmail source type (run once; safe to ignore if already exists)
alter type source_type add value if not exists 'gmail';
