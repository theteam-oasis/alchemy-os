-- Extend products with rich descriptive fields. The "New Product" modal in
-- both the team workspace and client portal collects these. Express mode
-- (paste a product URL) auto-fills them via /api/products/scrape.

alter table public.products
  add column if not exists description text,
  add column if not exists target_market text,
  add column if not exists problems_solved text,
  add column if not exists unique_features text[],
  add column if not exists price_point text,
  add column if not exists product_url text;
