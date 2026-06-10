-- Migration: CREATE FUNCTION get_fallback_recommendations (issue #255)
--
-- Replaces the 3-query fallback path in /api/recommendations/route.ts:
--   1. SELECT movie_id FROM movie_ratings WHERE user_id = p_user_id  (unbounded)
--   2. SELECT movie_id FROM movie_stats LIMIT limit * 10             (O(n*10))
--   3. SELECT * FROM movies WHERE id IN (candidateIds)               (round-trip)
--
-- New: single RPC with NOT EXISTS to exclude seen movies server-side.
-- Reduces 3 round-trips → 1. Eliminates the limit*10 multiplier.
-- LIMIT p_limit applied inside the DB — only the rows the caller needs come back.
--
-- SECURITY DEFINER required so RLS on movie_ratings is evaluated as the
-- function owner (service role), not the calling user. The p_user_id param
-- is explicit — no auth.uid() magic — so the ML pipeline and server routes
-- can call it safely.
--
-- Safe to run on live DB: CREATE OR REPLACE, no data modifications, no locks.

CREATE OR REPLACE FUNCTION get_fallback_recommendations(
  p_user_id  uuid,
  p_limit    int  DEFAULT 12
)
RETURNS TABLE (
  id                number,
  title             text,
  slug              text,
  release_date      text,
  poster_url        text,
  runtime_minutes   int,
  age_rating        text,
  original_language text,
  avg_rating        numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id::numeric           AS id,
    m.title                 AS title,
    m.slug                  AS slug,
    m.release_date::text    AS release_date,
    m.poster_url            AS poster_url,
    m.runtime_minutes       AS runtime_minutes,
    m.age_rating            AS age_rating,
    m.original_language     AS original_language,
    ms.avg_rating           AS avg_rating
  FROM   movie_stats ms
  JOIN   movies      m  ON m.id = ms.movie_id
  WHERE  NOT EXISTS (
    SELECT 1
    FROM   movie_ratings mr
    WHERE  mr.user_id   = p_user_id
      AND  mr.movie_id  = ms.movie_id
  )
  ORDER BY ms.avg_rating DESC NULLS LAST
  LIMIT  p_limit;
$$;

-- Grant EXECUTE to authenticated and anon roles so PostgREST can invoke it.
GRANT EXECUTE ON FUNCTION get_fallback_recommendations(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION get_fallback_recommendations(uuid, int) TO anon;
