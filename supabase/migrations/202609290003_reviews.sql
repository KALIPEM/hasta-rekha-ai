begin;
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reading_id uuid not null references public.readings(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review_text text not null check (char_length(review_text) between 10 and 500),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, reading_id)
);
create index if not exists reviews_published_created_idx on public.reviews(is_published, created_at desc);
alter table public.reviews enable row level security;
revoke all on public.reviews from anon, authenticated;
grant all on public.reviews to service_role;
commit;
