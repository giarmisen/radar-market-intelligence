-- Persist multi-source clusters from semantic dedupe at ingest time.
alter table signals
  add column if not exists grouped_sources jsonb,
  add column if not exists source_count smallint default 1;
