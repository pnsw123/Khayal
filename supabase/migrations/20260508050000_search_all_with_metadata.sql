-- Replace search_all RPC to include metadata fields needed by MovieCard
-- Adds: age_rating, original_language, runtime_minutes, genre_names[]

create or replace function public.search_all(
  query_text  text  default '',
  page_size   int   default 12,
  page_offset int   default 0
)
returns table (
  id               bigint,
  type             text,
  title            text,
  slug             text,
  overview         text,
  poster_url       text,
  release_year     int,
  relevance        real,
  age_rating       text,
  original_language text,
  runtime_minutes  int,
  genre_names      text[]
)
language sql
stable
security invoker
set search_path = public
as $$
  select id, type, title, slug, overview, poster_url, release_year, relevance,
         age_rating, original_language, runtime_minutes, genre_names
  from (
    select
      m.id,
      'movie'                                     as type,
      m.title,
      m.slug,
      m.overview,
      m.poster_url,
      extract(year from m.release_date)::int      as release_year,
      case
        when query_text = '' then 1.0
        else ts_rank(
          to_tsvector('english', coalesce(m.title,'') || ' ' || coalesce(m.overview,'')),
          plainto_tsquery('english', query_text)
        )
      end                                         as relevance,
      m.age_rating,
      m.original_language,
      m.runtime_minutes,
      coalesce(
        array_agg(g.name order by g.name) filter (where g.name is not null),
        array[]::text[]
      )                                           as genre_names
    from public.movies m
    left join public.movie_genres mg on mg.movie_id = m.id
    left join public.genres g on g.id = mg.genre_id
    where
      query_text = ''
      or to_tsvector('english', coalesce(m.title,'') || ' ' || coalesce(m.overview,''))
         @@ plainto_tsquery('english', query_text)
    group by m.id

    union all

    select
      t.id,
      'tv'                                        as type,
      t.title,
      t.slug,
      t.overview,
      t.poster_url,
      extract(year from t.first_air_date)::int    as release_year,
      case
        when query_text = '' then 1.0
        else ts_rank(
          to_tsvector('english', coalesce(t.title,'') || ' ' || coalesce(t.overview,''))  ,
          plainto_tsquery('english', query_text)
        )
      end                                         as relevance,
      null::text                                  as age_rating,
      null::text                                  as original_language,
      null::int                                   as runtime_minutes,
      coalesce(
        array_agg(g.name order by g.name) filter (where g.name is not null),
        array[]::text[]
      )                                           as genre_names
    from public.tv_series t
    left join public.tv_genres tg on tg.tv_series_id = t.id
    left join public.genres g on g.id = tg.genre_id
    where
      query_text = ''
      or to_tsvector('english', coalesce(t.title,'') || ' ' || coalesce(t.overview,''))
         @@ plainto_tsquery('english', query_text)
    group by t.id
  ) combined
  order by relevance desc
  limit  least(page_size, 100)
  offset page_offset;
$$;

grant execute on function public.search_all(text,int,int)
  to anon, authenticated;
