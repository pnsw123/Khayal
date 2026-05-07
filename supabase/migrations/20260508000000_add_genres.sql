-- Restore genres tables (previously dropped in 20260324145200_drop_genre_tables.sql)
-- Adds genres + bridge tables for movies and TV series

create table if not exists public.genres (
  id         bigserial   primary key,
  name       text        not null unique,
  slug       text        not null unique,
  tmdb_id    int         unique
);

create table if not exists public.movie_genres (
  movie_id   bigint      not null references public.movies(id)   on delete cascade,
  genre_id   bigint      not null references public.genres(id)   on delete cascade,
  primary key (movie_id, genre_id)
);

create table if not exists public.tv_genres (
  tv_series_id bigint    not null references public.tv_series(id) on delete cascade,
  genre_id     bigint    not null references public.genres(id)    on delete cascade,
  primary key (tv_series_id, genre_id)
);

-- Indexes for fast lookups
create index if not exists movie_genres_genre_id_idx   on public.movie_genres (genre_id);
create index if not exists tv_genres_genre_id_idx      on public.tv_genres    (genre_id);
create index if not exists tv_genres_tv_series_id_idx  on public.tv_genres    (tv_series_id);

-- RLS
alter table public.genres       enable row level security;
alter table public.movie_genres enable row level security;
alter table public.tv_genres    enable row level security;

-- Public read access (genres are catalog data)
create policy "genres_public_read"       on public.genres       for select using (true);
create policy "movie_genres_public_read" on public.movie_genres for select using (true);
create policy "tv_genres_public_read"    on public.tv_genres    for select using (true);

-- Admin write access
create policy "genres_admin_write"       on public.genres       for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "movie_genres_admin_write" on public.movie_genres for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
create policy "tv_genres_admin_write"    on public.tv_genres    for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
