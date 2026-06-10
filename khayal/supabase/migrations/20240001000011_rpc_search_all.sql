-- Migration: add search_all, search_movies, search_tv_series RPCs
--
-- These functions were created manually in production but never tracked as a migration.
-- Without this file, supabase db reset / CI environments lack the functions entirely,
-- causing search to fail with: "42883 function search_all does not exist".
--
-- Fixes issue #236.

CREATE OR REPLACE FUNCTION search_movies(
  query_text text,
  page_size  int DEFAULT 30,
  page_offset int DEFAULT 0
)
RETURNS TABLE (
  id                 bigint,
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
  WHERE to_tsvector('english', m.title || ' ' || COALESCE(m.overview, ''))
        @@ plainto_tsquery('english', query_text)
  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

CREATE OR REPLACE FUNCTION search_tv_series(
  query_text  text,
  page_size   int DEFAULT 30,
  page_offset int DEFAULT 0
)
RETURNS TABLE (
  id                 bigint,
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
    t.id::bigint,
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
  WHERE to_tsvector('english', t.title || ' ' || COALESCE(t.overview, ''))
        @@ plainto_tsquery('english', query_text)
  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

CREATE OR REPLACE FUNCTION search_all(
  query_text  text,
  page_size   int DEFAULT 30,
  page_offset int DEFAULT 0
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
  WHERE to_tsvector('english', m.title || ' ' || COALESCE(m.overview, ''))
        @@ plainto_tsquery('english', query_text)

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
  WHERE to_tsvector('english', t.title || ' ' || COALESCE(t.overview, ''))
        @@ plainto_tsquery('english', query_text)

  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;
