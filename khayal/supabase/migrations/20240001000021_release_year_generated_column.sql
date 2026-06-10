-- Migration: add stored release_year generated column with B-tree index
--
-- Fixes issue #306: search_all year-range filter called EXTRACT(YEAR FROM …)
-- at query time on every row that passed the FTS filter. That expression is
-- not indexable, forcing the planner to evaluate it row-by-row.
--
-- Fix: store release_year as a GENERATED ALWAYS AS … STORED int column on both
-- movies and tv_series, add a plain B-tree index on each, then rewrite
-- search_all / search_movies / search_tv_series to reference the stored column
-- directly in WHERE (index range scan) and SELECT (no runtime extraction).
--
-- Also removes the redundant EXTRACT(YEAR …) call from the SELECT list in
-- search_movies / search_tv_series (was already computing it even there).
--
-- Safe: GENERATED ALWAYS columns are backfilled immediately on ALTER TABLE
-- (full table rewrite), consistent the moment the migration runs.
-- B-tree indexes on an int column are fast to build and compact.

-- ── 1. Add stored generated release_year column ──────────────────────────────

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS release_year int
    GENERATED ALWAYS AS (
      EXTRACT(YEAR FROM release_date::date)::int
    ) STORED;

ALTER TABLE tv_series
  ADD COLUMN IF NOT EXISTS release_year int
    GENERATED ALWAYS AS (
      EXTRACT(YEAR FROM first_air_date::date)::int
    ) STORED;

-- ── 2. B-tree indexes on the stored column ───────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_movies_release_year
  ON movies (release_year);

CREATE INDEX IF NOT EXISTS idx_tv_series_release_year
  ON tv_series (release_year);

-- ── 3. Replace search_movies — reference stored release_year ─────────────────

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
    m.release_year,
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

-- ── 4. Replace search_tv_series — reference stored release_year ───────────────

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
    t.release_year,
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

-- ── 5. Replace search_all — reference stored release_year in WHERE + SELECT ───

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
    m.release_year,
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
    AND (p_year_start IS NULL OR m.release_year >= p_year_start)
    AND (p_year_end   IS NULL OR m.release_year <= p_year_end)
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
    t.release_year,
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
    AND (p_year_start IS NULL OR t.release_year >= p_year_start)
    AND (p_year_end   IS NULL OR t.release_year <= p_year_end)
    AND (p_genre IS NULL
         OR t.genre_names @> ARRAY[p_genre])

  ORDER BY relevance DESC
  LIMIT page_size
  OFFSET page_offset;
$$;
