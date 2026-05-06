-- Per-account content library for the Potential Energy demo. Each row
-- holds the full payload (20 posts + general feedback) for a single
-- influencer account, keyed by the slug-style account id used in the UI
-- ("riskreport", "reallifefeed", etc.). One row per account; we upsert
-- on every change. The payload is intentionally denormalized JSONB so we
-- can iterate on the shape from the client without schema changes.
create table if not exists marketing_demo_content (
  account_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Allow anonymous read/write for the demo. This dataset is deliberately
-- public for the sales demo so client viewers (no auth) can review and
-- annotate the content. If/when the real app adopts this table, lock it
-- down with proper RLS keyed off auth.uid() or a project-scoped role.
alter table marketing_demo_content enable row level security;

drop policy if exists "anon read pe content" on marketing_demo_content;
create policy "anon read pe content" on marketing_demo_content
  for select using (true);

drop policy if exists "anon write pe content" on marketing_demo_content;
create policy "anon write pe content" on marketing_demo_content
  for all using (true) with check (true);
