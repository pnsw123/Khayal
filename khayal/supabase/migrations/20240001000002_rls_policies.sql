-- Migration: Row-Level Security for all user-data tables (issue #154)
--
-- Without RLS, any authenticated user can read or modify any other user's rows
-- via Supabase's auto-generated REST API using the public anon key.
--
-- This migration:
--   1. Enables RLS on every user-data table
--   2. Adds SELECT / INSERT / UPDATE / DELETE policies scoped to auth.uid()
--   3. Adds public-read policies for movies, tv_series, and profiles
--   4. Adds public-SELECT-on-public-lists for user_lists
--
-- Safe to run on a live DB — no data is modified, no locks are held long-term.
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.

-- ── movies (public read-only) ─────────────────────────────────────────────────

ALTER TABLE movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movies_select_public" ON movies;
CREATE POLICY "movies_select_public"
  ON movies FOR SELECT
  USING (true);

-- ── tv_series (public read-only) ──────────────────────────────────────────────

ALTER TABLE tv_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_series_select_public" ON tv_series;
CREATE POLICY "tv_series_select_public"
  ON tv_series FOR SELECT
  USING (true);

-- ── profiles ──────────────────────────────────────────────────────────────────
-- Public SELECT so any page can display usernames/avatars.
-- Only the owner may UPDATE their own row.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON profiles;
CREATE POLICY "profiles_select_public"
  ON profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ── movie_ratings ─────────────────────────────────────────────────────────────

ALTER TABLE movie_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movie_ratings_select_own" ON movie_ratings;
CREATE POLICY "movie_ratings_select_own"
  ON movie_ratings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "movie_ratings_insert_own" ON movie_ratings;
CREATE POLICY "movie_ratings_insert_own"
  ON movie_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "movie_ratings_update_own" ON movie_ratings;
CREATE POLICY "movie_ratings_update_own"
  ON movie_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "movie_ratings_delete_own" ON movie_ratings;
CREATE POLICY "movie_ratings_delete_own"
  ON movie_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ── movie_reviews ─────────────────────────────────────────────────────────────

ALTER TABLE movie_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movie_reviews_select_public" ON movie_reviews;
CREATE POLICY "movie_reviews_select_public"
  ON movie_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "movie_reviews_insert_own" ON movie_reviews;
CREATE POLICY "movie_reviews_insert_own"
  ON movie_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "movie_reviews_update_own" ON movie_reviews;
CREATE POLICY "movie_reviews_update_own"
  ON movie_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "movie_reviews_delete_own" ON movie_reviews;
CREATE POLICY "movie_reviews_delete_own"
  ON movie_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ── tv_series_reviews ─────────────────────────────────────────────────────────

ALTER TABLE tv_series_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_series_reviews_select_public" ON tv_series_reviews;
CREATE POLICY "tv_series_reviews_select_public"
  ON tv_series_reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "tv_series_reviews_insert_own" ON tv_series_reviews;
CREATE POLICY "tv_series_reviews_insert_own"
  ON tv_series_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_series_reviews_update_own" ON tv_series_reviews;
CREATE POLICY "tv_series_reviews_update_own"
  ON tv_series_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_series_reviews_delete_own" ON tv_series_reviews;
CREATE POLICY "tv_series_reviews_delete_own"
  ON tv_series_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ── user_lists ────────────────────────────────────────────────────────────────
-- Owner sees all their lists; anyone can see public lists.

ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_lists_select_own_or_public" ON user_lists;
CREATE POLICY "user_lists_select_own_or_public"
  ON user_lists FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "user_lists_insert_own" ON user_lists;
CREATE POLICY "user_lists_insert_own"
  ON user_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_lists_update_own" ON user_lists;
CREATE POLICY "user_lists_update_own"
  ON user_lists FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_lists_delete_own" ON user_lists;
CREATE POLICY "user_lists_delete_own"
  ON user_lists FOR DELETE
  USING (auth.uid() = user_id);

-- ── user_list_movies ──────────────────────────────────────────────────────────
-- Ownership checked via parent user_lists row.

ALTER TABLE user_list_movies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_list_movies_select_own_or_public" ON user_list_movies;
CREATE POLICY "user_list_movies_select_own_or_public"
  ON user_list_movies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_id
        AND (ul.user_id = auth.uid() OR ul.is_public = true)
    )
  );

DROP POLICY IF EXISTS "user_list_movies_insert_own" ON user_list_movies;
CREATE POLICY "user_list_movies_insert_own"
  ON user_list_movies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_id
        AND ul.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_list_movies_delete_own" ON user_list_movies;
CREATE POLICY "user_list_movies_delete_own"
  ON user_list_movies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_id
        AND ul.user_id = auth.uid()
    )
  );

-- ── user_list_tv_series ───────────────────────────────────────────────────────

ALTER TABLE user_list_tv_series ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_list_tv_series_select_own_or_public" ON user_list_tv_series;
CREATE POLICY "user_list_tv_series_select_own_or_public"
  ON user_list_tv_series FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_id
        AND (ul.user_id = auth.uid() OR ul.is_public = true)
    )
  );

DROP POLICY IF EXISTS "user_list_tv_series_insert_own" ON user_list_tv_series;
CREATE POLICY "user_list_tv_series_insert_own"
  ON user_list_tv_series FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_id
        AND ul.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "user_list_tv_series_delete_own" ON user_list_tv_series;
CREATE POLICY "user_list_tv_series_delete_own"
  ON user_list_tv_series FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_lists ul
      WHERE ul.id = list_id
        AND ul.user_id = auth.uid()
    )
  );

-- ── tv_series_ratings ────────────────────────────────────────────────────────
-- Identical structure to movie_ratings — owner-scoped on all four operations.
-- Fix for issue #187: this table was missing RLS entirely.

ALTER TABLE tv_series_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_series_ratings_select_own" ON tv_series_ratings;
CREATE POLICY "tv_series_ratings_select_own"
  ON tv_series_ratings FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_series_ratings_insert_own" ON tv_series_ratings;
CREATE POLICY "tv_series_ratings_insert_own"
  ON tv_series_ratings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_series_ratings_update_own" ON tv_series_ratings;
CREATE POLICY "tv_series_ratings_update_own"
  ON tv_series_ratings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tv_series_ratings_delete_own" ON tv_series_ratings;
CREATE POLICY "tv_series_ratings_delete_own"
  ON tv_series_ratings FOR DELETE
  USING (auth.uid() = user_id);

-- ── recommendations ───────────────────────────────────────────────────────────
-- SELECT restricted to owner. INSERT/UPDATE/DELETE handled by service role only
-- (ML pipeline writes via SUPABASE_SERVICE_ROLE_KEY, bypasses RLS).

ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "recommendations_select_own" ON recommendations;
CREATE POLICY "recommendations_select_own"
  ON recommendations FOR SELECT
  USING (auth.uid() = user_id);
