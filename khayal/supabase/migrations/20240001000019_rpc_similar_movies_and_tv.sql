-- Migration: CREATE FUNCTION similar_movies + similar_tv_series (issue #273)
--
-- These RPCs are called by src/lib/similar.ts:
--   getSimilarMovies(movieId, limit)   → sb.rpc("similar_movies", ...)
--   getSimilarTvSeries(tvId, limit)    → sb.rpc("similar_tv_series", ...)
--
-- Both existed in production but had no migration, so `supabase db reset`
-- (used in CI integration tests) would fail with:
--   "42883 function similar_movies(integer, integer) does not exist"
--
-- Similarity algorithm: genre overlap via array containment.
-- Returns movies/series that share at least one genre with the source item,
-- excluding the source item itself, ordered by genre overlap count DESC,
-- then by release_date/first_air_date DESC as a tiebreaker.
--
-- Signatures match database.types.generated.ts (lines ~984–1011):
--   similar_movies(p_movie_id int, p_limit int DEFAULT 6)
--   similar_tv_series(p_tv_series_id int, p_limit int DEFAULT 6)
--
-- Safe to run on live DB: CREATE OR REPLACE, no data modifications, no locks.

-- ── similar_movies ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION similar_movies(
  p_movie_id  int,
  p_limit     int  DEFAULT 6
)
RETURNS TABLE (
  id           int,
  title        text,
  slug         text,
  poster_url   text,
  release_date text,
  genre_names  text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id                      AS id,
    m.title                   AS title,
    m.slug                    AS slug,
    m.poster_url              AS poster_url,
    m.release_date::text      AS release_date,
    m.genre_names             AS genre_names
  FROM movies m
  WHERE m.id <> p_movie_id
    AND m.genre_names && (
      SELECT genre_names
      FROM   movies
      WHERE  id = p_movie_id
    )
  ORDER BY
    -- rows sharing more genres rank higher
    cardinality(
      ARRAY(
        SELECT unnest(m.genre_names)
        INTERSECT
        SELECT unnest(
          (SELECT genre_names FROM movies WHERE id = p_movie_id)
        )
      )
    ) DESC,
    m.release_date DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Grant EXECUTE to authenticated and anon so PostgREST can invoke it.
GRANT EXECUTE ON FUNCTION similar_movies(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION similar_movies(int, int) TO anon;


-- ── similar_tv_series ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION similar_tv_series(
  p_tv_series_id  int,
  p_limit         int  DEFAULT 6
)
RETURNS TABLE (
  id             int,
  title          text,
  slug           text,
  poster_url     text,
  first_air_date text,
  genre_names    text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id                        AS id,
    t.title                     AS title,
    t.slug                      AS slug,
    t.poster_url                AS poster_url,
    t.first_air_date::text      AS first_air_date,
    t.genre_names               AS genre_names
  FROM tv_series t
  WHERE t.id <> p_tv_series_id
    AND t.genre_names && (
      SELECT genre_names
      FROM   tv_series
      WHERE  id = p_tv_series_id
    )
  ORDER BY
    cardinality(
      ARRAY(
        SELECT unnest(t.genre_names)
        INTERSECT
        SELECT unnest(
          (SELECT genre_names FROM tv_series WHERE id = p_tv_series_id)
        )
      )
    ) DESC,
    t.first_air_date DESC NULLS LAST
  LIMIT p_limit;
$$;

-- Grant EXECUTE to authenticated and anon so PostgREST can invoke it.
GRANT EXECUTE ON FUNCTION similar_tv_series(int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION similar_tv_series(int, int) TO anon;
