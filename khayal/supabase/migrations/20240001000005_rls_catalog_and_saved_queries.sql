-- Migration: RLS for catalog tables + saved_queries (issue #189)
--
-- Problem:
--   genres, people, seasons, watch_providers, movie_credits, tv_credits,
--   movie_genres, tv_genres, and saved_queries had no RLS enabled.
--
--   saved_queries stores per-user query history — without RLS any authenticated
--   user could read or delete other users' rows via the Supabase REST API.
--
--   Catalog tables (genres, people, etc.) are read-only public data, but enabling
--   RLS + explicit public SELECT policy prevents accidental writes via the anon key
--   and makes the security model explicit.
--
-- This migration:
--   1. Enables RLS on all nine tables
--   2. Adds owner-scoped policies for saved_queries (SELECT/INSERT/UPDATE/DELETE)
--   3. Adds public SELECT policy for all catalog tables (defence-in-depth)
--      — no INSERT/UPDATE/DELETE policies → writes require service_role key
--
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.

-- ── saved_queries ─────────────────────────────────────────────────────────────
-- user_id is nullable; NULL rows are system defaults visible to everyone.

ALTER TABLE saved_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "saved_queries_select_own_or_default" ON saved_queries;
CREATE POLICY "saved_queries_select_own_or_default"
  ON saved_queries FOR SELECT
  USING (auth.uid() = user_id OR is_default = true);

DROP POLICY IF EXISTS "saved_queries_insert_own" ON saved_queries;
CREATE POLICY "saved_queries_insert_own"
  ON saved_queries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_queries_update_own" ON saved_queries;
CREATE POLICY "saved_queries_update_own"
  ON saved_queries FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "saved_queries_delete_own" ON saved_queries;
CREATE POLICY "saved_queries_delete_own"
  ON saved_queries FOR DELETE
  USING (auth.uid() = user_id);

-- ── genres (public catalog, read-only) ───────────────────────────────────────

ALTER TABLE genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "genres_select_public" ON genres;
CREATE POLICY "genres_select_public"
  ON genres FOR SELECT
  USING (true);

-- ── people (public catalog, read-only) ───────────────────────────────────────

ALTER TABLE people ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "people_select_public" ON people;
CREATE POLICY "people_select_public"
  ON people FOR SELECT
  USING (true);

-- ── seasons (public catalog, read-only) ──────────────────────────────────────

ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seasons_select_public" ON seasons;
CREATE POLICY "seasons_select_public"
  ON seasons FOR SELECT
  USING (true);

-- ── watch_providers (public catalog, read-only) ───────────────────────────────

ALTER TABLE watch_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "watch_providers_select_public" ON watch_providers;
CREATE POLICY "watch_providers_select_public"
  ON watch_providers FOR SELECT
  USING (true);

-- ── movie_credits (public catalog, read-only) ─────────────────────────────────

ALTER TABLE movie_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movie_credits_select_public" ON movie_credits;
CREATE POLICY "movie_credits_select_public"
  ON movie_credits FOR SELECT
  USING (true);

-- ── tv_credits (public catalog, read-only) ────────────────────────────────────

ALTER TABLE tv_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_credits_select_public" ON tv_credits;
CREATE POLICY "tv_credits_select_public"
  ON tv_credits FOR SELECT
  USING (true);

-- ── movie_genres (public junction, read-only) ─────────────────────────────────

ALTER TABLE movie_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "movie_genres_select_public" ON movie_genres;
CREATE POLICY "movie_genres_select_public"
  ON movie_genres FOR SELECT
  USING (true);

-- ── tv_genres (public junction, read-only) ────────────────────────────────────

ALTER TABLE tv_genres ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tv_genres_select_public" ON tv_genres;
CREATE POLICY "tv_genres_select_public"
  ON tv_genres FOR SELECT
  USING (true);
