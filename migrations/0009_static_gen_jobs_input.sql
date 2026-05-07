-- Static Studio two-phase flow needs to stash inputs (phase, scene prompts,
-- selected reference image, parent job for variant runs) on the job row so
-- the chunk worker + UI can route correctly without re-deriving everything.
-- We use a single jsonb column to avoid migration churn over time.

alter table public.static_gen_jobs
  add column if not exists input jsonb default '{}'::jsonb;
