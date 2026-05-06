-- BrandKit display reads intake.industry and intake.location, but those
-- columns weren't added to the brand_intake schema in older Supabase
-- projects. Add them as plain text. Idempotent.

alter table brand_intake
  add column if not exists industry text,
  add column if not exists location text;
