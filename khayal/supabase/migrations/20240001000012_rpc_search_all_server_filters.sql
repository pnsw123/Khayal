-- Migration: add server-side filter params to search_all RPC
--
-- Fixes issue #238: client-side filtering on type/year/genre broke genre filter
-- (genre_names was absent from generated types) and made pagination incorrect.
--
-- New optional params:
--   p_type       text    – filter by 'movie' or 'tv'  (NULL = both)
--   p_year_start int     – release_year >= p_year_start (NULL = no lower bound)
--   p_year_end   int     – release_year <= p_year_end   (NULL = no upper bound)
--   p_genre      text    – genre name, case-insensitive  (NULL = no filter)
--
-- Also adds missing return columns (age_rating, original_language,
-- runtime_minutes, genre_names) to match the actual migration 11 SQL.

CREATE OR REPLACE FUNCTION search_all(
  query_text   text,
  page_size    int  DEFAULT 30,
  page_offset  int  DEFAULT 0,
  p_type       text DEFAULT NULL,
  p_year_start int  DEFAULT NULL,
  p_year_end   int  DEFAULT NULL,
  p_genre      text DEFAULT NULL
)
RETURNS TABLE (
  id                 bigint,
  type               text,
  title              text,
  slug               text,
  overview           text,
  poster_url         text,
  release_year       int,
  relevance          float,
  age_rating         text,
  original_language  text,
  runtime_minutes    int,
  genre_names        text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id::bigint,
    'movie'::text AS type,
    m.title,
    m.slug,
    m.overview,
    m.poster_url,
    EXTRACT(YEAR FROM m.release_date::date)::int AS release_year,
    ts_rank(
      to_tsvector('english', m.title || ' ' || COALESCE(m.overview, '')),
      plainto_tsquery('english', query_text)
    )::float AS relevance,
    m.age_rating,
    m.original_language,
    m.runtime_minutes,
    m.genre_names
  FROM movies m
  WHERE
    to_tsvector('english', m.title || ' ' || COALESCE(m.overview, ''))
      @@ plainto_tsquery('english', query_text)
    AND (p_type IS NULL OR p_type = 'movie')
    AND (p_year_start IS NULL
         OR EXTRACT(YEAR FROM m.release_date::date)::int >= p_year_start)
    AND (p_year_end IS NULL
         OR EXTRACT(YEAR FROM m.release_date::date)::int <= p_year_end)
    AND (p_genre IS NULL
         OR EXISTS (
           SELECT 1 FROM unnest(m.genre_names) g
           WHERE lower(g) = lower(p_genre)
         ))

  UNION ALL

  SELECT
    t.id::bigint,
    'tv'::text AS type,
    t.title,
    t.slug,
    t.overview,
    t.poster_url,
    EXTRACT(YEAR FROM t.first_air_date::date)::int AS release_year,
    ts_rank(
      to_tsvector('english', t.title || ' ' || COALESCE(t.overview, '')),
      plainto_tsquery('english', query_text)
    )::float AS relevance,
    NULL::text  AS age_rating,
    NULL::text  AS original_language,
    NULL::int   AS runtime_minutes,
    t.genre_names
  FROM tv_series t
  WHERE
    to_tsvector('english', t.title || ' ' || COALESCE(t.overview, ''))
      @@ plainto_tsquery('english', query_text)
    AND (p_type IS NULL OR p_type = 'tv')
    AND (p_year_start IS NULL
         OR EXTRACT(YEAR FROM t.first_air_date::date)::int >= p_year_start)
    AND (p_year_end IS NULL
         OR EXTRACT(YEAR FROM t.first_air_date::date)::int <= p_year_end)
    AND (p_genre IS NULL
         OR EXISTS (
           SELECT 1 FROM unnest(t.genre_names) g
           WHERE lower(g) = lower(p_genre)
         ))

  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;
