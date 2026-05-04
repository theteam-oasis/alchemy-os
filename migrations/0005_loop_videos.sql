-- "Loops" are a third video category alongside Hero and UGC. Unlike those,
-- Loop videos have no script — they're standalone clips (looped product
-- demos, ambient brand films, hero scene loops, etc.). Stored as a small
-- JSON array on portal_projects: [{ id, title, videoUrl, videoName,
-- videoRatio, videoVersionHistory }].

alter table portal_projects
  add column if not exists loop_videos jsonb default '[]'::jsonb;
