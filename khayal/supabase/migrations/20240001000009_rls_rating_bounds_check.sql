-- Migration: Add rating bounds enforcement to movie_ratings and tv_series_ratings (issue #223)
--
-- PROBLEM:
--   INSERT/UPDATE policies on movie_ratings and tv_series_ratings previously only
--   checked auth.uid() = user_id. A malicious authenticated user could insert any
--   integer (e.g. rating = 9999) via direct REST/PostgREST calls using the anon key,
--   bypassing client-side validation entirely.
--
-- FIX:
--   Extend WITH CHECK on INSERT and UPDATE policies to also enforce
--   rating BETWEEN 1 AND 10 at the database layer.
--
-- NOTE — intentional aggregate-via-SECURITY-DEFINER pattern:
--   The get_movie_detail and get_tv_series_detail RPCs are SECURITY DEFINER functions
--   that read movie_stats / tv_series_stats (aggregate views over the ratings tables).
--   Because the views aggregate data (AVG, COUNT) without exposing individual rows,
--   RLS on the underlying tables does not need to be bypassed at the row level —
--   the aggregate result is intentionally public. This is safe: no individual user's
--   rating is disclosed, only the aggregate. The SECURITY DEFINER flag is required
--   specifically so that the RPC can read across all users' ratings to compute the
--   aggregate, while the SELECT policy on the base table still restricts direct
--   per-row reads to the owning user.
--
-- Safe to run on live DB — no data modified, no long-term locks.
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.

-- ── movie_ratings ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "movie_ratings_insert_own" ON movie_ratings;
CREATE POLICY "movie_ratings_insert_own"
  ON movie_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 10);

DROP POLICY IF EXISTS "movie_ratings_update_own" ON movie_ratings;
CREATE POLICY "movie_ratings_update_own"
  ON movie_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 10);

-- ── tv_series_ratings ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "tv_series_ratings_insert_own" ON tv_series_ratings;
CREATE POLICY "tv_series_ratings_insert_own"
  ON tv_series_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 10);

DROP POLICY IF EXISTS "tv_series_ratings_update_own" ON tv_series_ratings;
CREATE POLICY "tv_series_ratings_update_own"
  ON tv_series_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND rating BETWEEN 1 AND 10);
