-- Add extra TMDB fields: tagline, budget, revenue, popularity
-- Also add watch_providers table for "Available on Netflix/Prime/etc."

alter table public.movies
  add column if not exists tagline    text,
  add column if not exists budget     bigint,
  add column if not exists revenue    bigint,
  add column if not exists popularity float;

alter table public.tv_series
  add column if not exists tagline    text,
  add column if not exists popularity float;

-- Index popularity for trending queries
create index if not exists movies_popularity_idx    on public.movies    (popularity desc nulls last);
create index if not exists tv_series_popularity_idx on public.tv_series (popularity desc nulls last);

-- Watch providers: "Available on Netflix / Prime / Disney+" per title
create table if not exists public.watch_providers (
  id                bigserial primary key,
  movie_id          bigint    references public.movies(id)    on delete cascade,
  tv_series_id      bigint    references public.tv_series(id) on delete cascade,
  provider_name     text      not null,
  provider_logo_url text,
  country_code      char(2)   not null default 'US',
  link              text,
  -- Exactly one of movie_id / tv_series_id must be set
  constraint watch_provider_xor check (
    (movie_id is not null)::int + (tv_series_id is not null)::int = 1
  )
);

create index if not exists watch_providers_movie_id_idx      on public.watch_providers (movie_id)      where movie_id is not null;
create index if not exists watch_providers_tv_series_id_idx  on public.watch_providers (tv_series_id)  where tv_series_id is not null;

alter table public.watch_providers enable row level security;
create policy "watch_providers_public_read" on public.watch_providers for select using (true);
create policy "watch_providers_admin_write" on public.watch_providers for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
