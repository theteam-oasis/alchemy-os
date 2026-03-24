-- ============================================
-- ALCHEMY OS - Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- ─── Clients ───
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  name text not null,
  status text default 'onboarding' check (status in ('onboarding', 'reviewing', 'production', 'delivered', 'paused')),
  stage text default 'Intake Form',
  progress integer default 0,
  color text default '#FFD60A'
);

-- ─── Brand Intake ───
create table public.brand_intake (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamp with time zone default now(),
  
  -- Brand Identity
  brand_name text,
  tagline text,
  story text,
  personality_tags text[] default '{}',
  website text,
  
  -- Tone (0-100 sliders)
  tone_formality integer default 50,
  tone_mood integer default 50,
  tone_intensity integer default 50,
  
  -- Target Audience
  audience_description text,
  age_range text,
  competitors text,
  deepest_fears text,
  deepest_desires text,
  
  -- AI Influencer
  influencer_age text,
  influencer_gender text,
  influencer_ethnicity text,
  influencer_body_type text,
  influencer_hair_color text,
  influencer_hair_style text,
  influencer_beauty_level text,
  influencer_style text,
  influencer_personality text,
  influencer_notes text,
  
  -- Unique Features & Testimonials
  unique_features text[] default '{}',
  testimonials text[] default '{}',
  
  -- Audio & Voice
  voice_style text[] default '{}',
  voice_gender text,
  voice_age text,
  voice_notes text,
  music_mood text[] default '{}',
  music_genres text[] default '{}',
  music_notes text,
  
  -- Video
  video_pace integer default 50,
  video_energy integer default 50,
  video_transitions text,
  video_cuts text,
  video_notes text,
  
  -- Campaign
  objective text,
  key_message text,
  brand_colors text,
  
  -- Product images stored as array of storage URLs
  product_image_urls text[] default '{}'
);

-- ─── Brand Hub (AI-generated guidelines) ───
create table public.brand_hub (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamp with time zone default now(),
  
  -- Full generated guidelines as JSON
  guidelines jsonb,
  
  -- Section approval status
  section_statuses jsonb default '{"brandSummary":"pending","toneOfVoice":"pending","audiencePersona":"pending","visualDirection":"pending","copyDirection":"pending"}',
  
  -- Locked status
  is_locked boolean default false,
  locked_at timestamp with time zone,
  
  -- Generation metadata
  generation_round integer default 1
);

-- ─── Feedback Sessions ───
create table public.feedback (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  brand_hub_id uuid references public.brand_hub(id) on delete cascade,
  created_at timestamp with time zone default now(),
  
  section_key text not null,
  feedback_text text,
  parsed_instructions jsonb,
  
  -- Was this feedback used to regenerate?
  triggered_regeneration boolean default false
);

-- ─── Internal Notes ───
create table public.internal_notes (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  created_at timestamp with time zone default now(),
  
  note_text text not null,
  author text default 'Agency'
);

-- ─── Storage bucket for product images ───
insert into storage.buckets (id, name, public) 
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

-- ─── Row Level Security ───
-- For now, allow all authenticated access (single agency use)
-- Tighten this when you add client portal auth

alter table public.clients enable row level security;
alter table public.brand_intake enable row level security;
alter table public.brand_hub enable row level security;
alter table public.feedback enable row level security;
alter table public.internal_notes enable row level security;

-- Allow all operations for authenticated users
create policy "Allow all for authenticated" on public.clients for all using (true) with check (true);
create policy "Allow all for authenticated" on public.brand_intake for all using (true) with check (true);
create policy "Allow all for authenticated" on public.brand_hub for all using (true) with check (true);
create policy "Allow all for authenticated" on public.feedback for all using (true) with check (true);
create policy "Allow all for authenticated" on public.internal_notes for all using (true) with check (true);

-- Storage policy
create policy "Public brand assets" on storage.objects for all using (bucket_id = 'brand-assets') with check (bucket_id = 'brand-assets');

-- ─── Auto-update timestamp trigger ───
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger clients_updated_at
  before update on public.clients
  for each row execute function update_updated_at();

-- ─── Indexes ───
create index idx_brand_intake_client on public.brand_intake(client_id);
create index idx_brand_hub_client on public.brand_hub(client_id);
create index idx_feedback_client on public.feedback(client_id);
create index idx_notes_client on public.internal_notes(client_id);
