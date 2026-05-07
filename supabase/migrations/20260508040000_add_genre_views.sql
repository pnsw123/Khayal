-- Views: movies and TV series with genre names as an array
-- Used by browse page to show genre tags on cards without N+1 queries

create or replace view public.movies_with_genres as
select
  m.*,
  coalesce(
    array_agg(g.name order by g.name) filter (where g.name is not null),
    array[]::text[]
  ) as genre_names
from public.movies m
left join public.movie_genres mg on mg.movie_id = m.id
left join public.genres g on g.id = mg.genre_id
group by m.id;

create or replace view public.tv_series_with_genres as
select
  s.*,
  coalesce(
    array_agg(g.name order by g.name) filter (where g.name is not null),
    array[]::text[]
  ) as genre_names
from public.tv_series s
left join public.tv_genres tg on tg.tv_series_id = s.id
left join public.genres g on g.id = tg.genre_id
group by s.id;
