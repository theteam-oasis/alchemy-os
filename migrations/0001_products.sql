-- Products: each client can have multiple products. Brand kit is shared
-- across all products, but each product has its own creatives portal, its own
-- analytics dashboard, and its own product images.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  slug text,
  product_image_urls text[],
  position int default 0,
  created_at timestamptz default now()
);

create index if not exists products_client_id_idx on public.products(client_id);

-- Link existing assets to a product. Nullable for now so old rows still load,
-- but new portal_projects and marketing_dashboards should always have one.
alter table public.portal_projects
  add column if not exists product_id uuid references public.products(id) on delete set null;

alter table public.marketing_dashboards
  add column if not exists product_id uuid references public.products(id) on delete set null;

-- Auto-migrate: every existing client gets a single "Main" product, then we
-- link all of its existing portal_projects and marketing_dashboards to it.
do $$
declare
  c record;
  product_id uuid;
begin
  for c in select id, name from public.clients loop
    -- Only create if the client has no product yet
    if not exists (select 1 from public.products where client_id = c.id) then
      insert into public.products (client_id, name, slug, position)
      values (c.id, 'Main', 'main', 0)
      returning id into product_id;

      update public.portal_projects set product_id = product_id where client_id = c.id and product_id is null;
      update public.marketing_dashboards set product_id = product_id where client_id = c.id and product_id is null;
    end if;
  end loop;
end $$;
