-- Add seasons table for TV series
-- Partial restore of what was dropped in 20260324144000_drop_tv_seasons_and_episodes.sql
-- We only track season-level data (not episodes) to keep the schema lean.

create table if not exists public.seasons (
  id             bigserial   primary key,
  tv_series_id   bigint      not null references public.tv_series(id) on delete cascade,
  season_number  int         not null,
  name           text,
  overview       text,
  air_date       date,
  episode_count  int,
  poster_url     text,
  tmdb_season_id int,
  unique (tv_series_id, season_number)
);

create index if not exists seasons_tv_series_id_idx on public.seasons (tv_series_id, season_number);

alter table public.seasons enable row level security;

create policy "seasons_public_read" on public.seasons for select using (true);
create policy "seasons_admin_write" on public.seasons for all
  using ((select role from public.profiles where id = auth.uid()) = 'admin');
