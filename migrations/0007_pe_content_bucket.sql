-- Dedicated public bucket for the Potential Energy demo content library.
-- We were uploading into brand-assets, but its RLS / public flag isn't
-- guaranteed to allow anon writes from the marketing demo. A purpose-
-- built public bucket sidesteps every "some images don't load" issue
-- caused by signed-URL expiry, RLS denials, or wrong public flag.
insert into storage.buckets (id, name, public, file_size_limit)
values ('pe-content', 'pe-content', true, 26214400)  -- 25 MiB per file is plenty after downscale
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit;

-- Anyone can read (the demo is intentionally open for client review).
drop policy if exists "pe-content public read" on storage.objects;
create policy "pe-content public read" on storage.objects
  for select using (bucket_id = 'pe-content');

-- Anon clients can upload during the demo.
drop policy if exists "pe-content anon insert" on storage.objects;
create policy "pe-content anon insert" on storage.objects
  for insert with check (bucket_id = 'pe-content');

drop policy if exists "pe-content anon update" on storage.objects;
create policy "pe-content anon update" on storage.objects
  for update using (bucket_id = 'pe-content');

drop policy if exists "pe-content anon delete" on storage.objects;
create policy "pe-content anon delete" on storage.objects
  for delete using (bucket_id = 'pe-content');
