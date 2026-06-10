-- Migration: Fix SECURITY DEFINER functions missing SET search_path (issue #222)
--
-- SECURITY DEFINER functions without a pinned search_path are vulnerable to
-- schema injection: a malicious user could create a schema that shadows `public`
-- and redirect the function's table lookups to attacker-controlled tables.
--
-- Fix: add `SET search_path = public, pg_catalog` to both function declarations.
-- Both functions are idempotent (CREATE OR REPLACE FUNCTION).
-- Safe to run on a live DB: no data modifications, no table locks.

-- ── get_movie_detail ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_movie_detail(
  movie_slug            text,
  requesting_user_id    uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_movie   json;
  v_stats   json;
  v_reviews json;
BEGIN
  -- Fetch movie row
  SELECT row_to_json(m)
  INTO   v_movie
  FROM   movies m
  WHERE  m.slug = movie_slug;

  IF v_movie IS NULL THEN
    RETURN NULL;
  END IF;

  -- Aggregate stats from the movie_stats view
  SELECT json_build_object(
    'movie_id',      ms.movie_id,
    'avg_rating',    ms.avg_rating,
    'total_ratings', COALESCE(ms.total_ratings, 0),
    'total_reviews', COALESCE(ms.total_reviews, 0)
  )
  INTO   v_stats
  FROM   movie_stats ms
  WHERE  ms.movie_id = (v_movie->>'id')::int;

  -- Fetch up to 50 public reviews, newest first, joined with profile names
  SELECT json_agg(r ORDER BY r.created_at DESC)
  INTO   v_reviews
  FROM (
    SELECT
      mr.id,
      mr.headline,
      mr.body,
      mr.contains_spoiler,
      mr.created_at,
      p.username,
      p.display_name,
      p.avatar_url
    FROM   movie_reviews mr
    LEFT JOIN profiles p ON p.id = mr.user_id
    WHERE  mr.movie_id = (v_movie->>'id')::int
    ORDER  BY mr.created_at DESC
    LIMIT  50
  ) r;

  RETURN json_build_object(
    'movie',   v_movie,
    'stats',   v_stats,
    'reviews', COALESCE(v_reviews, '[]'::json)
  );
END;
$$;

-- ── get_tv_detail ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_tv_detail(
  series_slug           text,
  requesting_user_id    uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_series  json;
  v_stats   json;
  v_reviews json;
BEGIN
  -- Fetch tv_series row
  SELECT row_to_json(ts)
  INTO   v_series
  FROM   tv_series ts
  WHERE  ts.slug = series_slug;

  IF v_series IS NULL THEN
    RETURN NULL;
  END IF;

  -- Aggregate stats from the tv_series_stats view
  SELECT json_build_object(
    'tv_series_id',  tss.tv_series_id,
    'avg_rating',    tss.avg_rating,
    'total_ratings', COALESCE(tss.total_ratings, 0),
    'total_reviews', COALESCE(tss.total_reviews, 0)
  )
  INTO   v_stats
  FROM   tv_series_stats tss
  WHERE  tss.tv_series_id = (v_series->>'id')::int;

  -- Fetch up to 50 public reviews, newest first, joined with profile names
  SELECT json_agg(r ORDER BY r.created_at DESC)
  INTO   v_reviews
  FROM (
    SELECT
      tvr.id,
      tvr.headline,
      tvr.body,
      tvr.contains_spoiler,
      tvr.created_at,
      p.username,
      p.display_name,
      p.avatar_url
    FROM   tv_series_reviews tvr
    LEFT JOIN profiles p ON p.id = tvr.user_id
    WHERE  tvr.tv_series_id = (v_series->>'id')::int
    ORDER  BY tvr.created_at DESC
    LIMIT  50
  ) r;

  RETURN json_build_object(
    'tv_series', v_series,
    'stats',     v_stats,
    'reviews',   COALESCE(v_reviews, '[]'::json)
  );
END;
$$;

-- Grant execute to authenticated + anon roles (PostgREST needs these)
GRANT EXECUTE ON FUNCTION get_movie_detail(text, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_tv_detail(text, uuid)    TO authenticated, anon;
