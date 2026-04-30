-- Raise the per-file size cap on the brand-assets bucket so the team can
-- upload full-resolution video renders (often 200MB-2GB) without Supabase
-- Storage rejecting them as "too big". The TUS resumable client we use on
-- the team side handles multi-GB uploads in 6MB chunks, but Supabase still
-- enforces the bucket-level cap before TUS can complete.
--
-- 5 GB is the Supabase Pro per-file ceiling; we set the bucket to that so
-- it never gets in the way. (Actual project storage cap is plan-level.)
update storage.buckets
set file_size_limit = 5368709120  -- 5 GiB
where id = 'brand-assets';
