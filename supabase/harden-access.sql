-- Cierra la Brecha 2 (base de datos abierta).
-- Ejecutar una vez en el SQL Editor de Supabase, contra la base de datos ya desplegada.
--
-- Que hace: activa Row Level Security en todas las tablas y retira los
-- permisos "grant all" que schema.sql y grants.sql daban a anon/authenticated.
-- No hace falta escribir policies: con RLS activo y cero policies, Postgres
-- deniega el acceso por defecto a esos roles. service_role sigue funcionando
-- exactamente igual que hasta ahora (bypassa RLS por diseño en Supabase), asi
-- que el codigo del servidor (que solo usa SUPABASE_SERVICE_ROLE_KEY) no se ve
-- afectado. Ninguna pagina publica (dashboard, timeline, perfiles de actor) usa
-- la anon key en el navegador, todas leen via lib/ en el servidor, asi que
-- tampoco se ven afectadas.

alter table domains enable row level security;
alter table actors enable row level security;
alter table radar_queries enable row level security;
alter table sources enable row level security;
alter table signals enable row level security;
alter table signal_actors enable row level security;
alter table proposals enable row level security;
alter table gmail_tokens enable row level security;
alter table actor_profiles enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke select on living_document, upcoming_events from anon, authenticated;

alter default privileges in schema public
  revoke all on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
