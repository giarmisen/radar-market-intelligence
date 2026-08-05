-- Gmail OAuth refresh token storage (persists across deploys)
create table if not exists gmail_tokens (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  refresh_token text not null,
  updated_at timestamptz default now()
);

alter table gmail_tokens enable row level security;

-- Add gmail source type (run once; safe to ignore if already exists)
alter type source_type add value if not exists 'gmail';
