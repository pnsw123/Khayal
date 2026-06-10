-- Migration: add stored GENERATED ALWAYS tsvector columns to movies and tv_series
--
-- Fixes issue #270: search_all / search_movies / search_tv_series were computing
-- to_tsvector('english', title || ' ' || COALESCE(overview, '')) once per row in
-- the WHERE predicate AND again inside ts_rank(), because no stored column existed.
--
-- The existing GIN expression indexes (idx_movies_fts, idx_tv_series_fts) let the
-- planner skip the WHERE recompute via an index scan, but ts_rank() still re-evaluates
-- the expression for every row that passes the filter.
--
-- Canonical Postgres FTS pattern: store the tsvector once as a GENERATED ALWAYS
-- column, index THAT column, and reference it directly in both WHERE and ts_rank().
-- Result: tsvector computed once at write time, never at query time.
--
-- Steps:
--   1. Add search_vector GENERATED ALWAYS column to movies and tv_series
--   2. Drop old GIN expression indexes (replaced by index on stored column)
--   3. Create new GIN indexes on the stored column
--   4. Replace search_movies, search_tv_series, search_all RPCs to reference
--      the stored column instead of calling to_tsvector() at query time
--
-- Safe: GENERATED ALWAYS columns are populated by Postgres immediately (full table
-- rewrite on ALTER TABLE), so the column is consistent from the moment the migration
-- runs. Old expression indexes are dropped only after the new ones exist (both exist
-- momentarily; the DROP happens in the same transaction).
--
-- Note: CREATE INDEX CONCURRENTLY cannot run inside a transaction block. Supabase
-- migrations run in a transaction by default, so we use plain CREATE INDEX here.
-- For large production tables run the CONCURRENTLY variant out-of-band if needed.

-- ── 1. Add stored generated tsvector columns ─────────────────────────────────

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', title || ' ' || COALESCE(overview, ''))
    ) STORED;

ALTER TABLE tv_series
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (
      to_tsvector('english', title || ' ' || COALESCE(overview, ''))
    ) STORED;

-- ── 2. Replace GIN indexes: expression → stored column ───────────────────────

DROP INDEX IF EXISTS idx_movies_fts;
CREATE INDEX IF NOT EXISTS idx_movies_search_vector
  ON movies USING GIN(search_vector);

DROP INDEX IF EXISTS idx_tv_series_fts;
CREATE INDEX IF NOT EXISTS idx_tv_series_search_vector
  ON tv_series USING GIN(search_vector);

-- ── 3. Replace search_movies — use stored column ─────────────────────────────

CREATE OR REPLACE FUNCTION search_movies(
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
    m.id::bigint,
    m.title,
    m.slug,
    m.overview,
    m.poster_url,
    EXTRACT(YEAR FROM m.release_date::date)::int AS release_year,
    ts_rank(
      m.search_vector,
      plainto_tsquery('english', query_text)
    )::float AS relevance,
    m.age_rating,
    m.original_language,
    m.runtime_minutes,
    m.genre_names
  FROM movies m
  WHERE m.search_vector @@ plainto_tsquery('english', query_text)
  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

-- ── 4. Replace search_tv_series — use stored column ──────────────────────────

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
      t.search_vector,
      plainto_tsquery('english', query_text)
    )::float AS relevance,
    NULL::text  AS age_rating,
    NULL::text  AS original_language,
    NULL::int   AS runtime_minutes,
    t.genre_names
  FROM tv_series t
  WHERE t.search_vector @@ plainto_tsquery('english', query_text)
  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;

-- ── 5. Replace search_all (with server-side filters) — use stored column ──────

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
      m.search_vector,
      plainto_tsquery('english', query_text)
    )::float AS relevance,
    m.age_rating,
    m.original_language,
    m.runtime_minutes,
    m.genre_names
  FROM movies m
  WHERE
    m.search_vector @@ plainto_tsquery('english', query_text)
    AND (p_type IS NULL OR p_type = 'movie')
    AND (p_year_start IS NULL
         OR EXTRACT(YEAR FROM m.release_date::date)::int >= p_year_start)
    AND (p_year_end IS NULL
         OR EXTRACT(YEAR FROM m.release_date::date)::int <= p_year_end)
    AND (p_genre IS NULL
         OR m.genre_names @> ARRAY[p_genre])

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
      t.search_vector,
      plainto_tsquery('english', query_text)
    )::float AS relevance,
    NULL::text  AS age_rating,
    NULL::text  AS original_language,
    NULL::int   AS runtime_minutes,
    t.genre_names
  FROM tv_series t
  WHERE
    t.search_vector @@ plainto_tsquery('english', query_text)
    AND (p_type IS NULL OR p_type = 'tv')
    AND (p_year_start IS NULL
         OR EXTRACT(YEAR FROM t.first_air_date::date)::int >= p_year_start)
    AND (p_year_end IS NULL
         OR EXTRACT(YEAR FROM t.first_air_date::date)::int <= p_year_end)
    AND (p_genre IS NULL
         OR t.genre_names @> ARRAY[p_genre])

  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;
