-- Run once in Supabase SQL Editor if actor_profiles seeding hits RLS errors.
-- v1: single-analyst tool — match other Radar tables (no RLS).

alter table actor_profiles disable row level security;

grant all on table actor_profiles to anon, authenticated, service_role;
