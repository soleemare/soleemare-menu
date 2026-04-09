create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('hero', 'coupon')),
  visual_variant text not null,
  image_url text not null,
  badge text not null,
  title text not null,
  description text not null,
  primary_cta_label text not null,
  primary_cta_href text not null,
  code text,
  price_text text,
  old_price_text text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists banners_sort_order_idx
  on public.banners (sort_order asc);

create or replace function public.update_banners_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists banners_set_updated_at on public.banners;

create trigger banners_set_updated_at
before update on public.banners
for each row
execute function public.update_banners_updated_at();
