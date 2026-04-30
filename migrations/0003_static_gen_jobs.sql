-- Static Studio job table. Each "Generate 25 ads" click creates a job row.
-- The /start endpoint fans out chunk requests server-side and uses waitUntil
-- so generation continues even after the user closes the browser tab. The UI
-- polls /status?id= to render progress and final images.

create extension if not exists pgcrypto;

create table if not exists static_gen_jobs (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null,
  product_id   uuid,
  portal_id    uuid,
  portal_slug  text,
  total        int default 0,
  completed    int default 0,
  failed       int default 0,
  images       jsonb default '[]'::jsonb,
  failures     jsonb default '[]'::jsonb,
  status       text default 'running',  -- running | done | error
  error        text,
  aspect_ratio text default '1:1',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_static_gen_jobs_client on static_gen_jobs(client_id, created_at desc);
