-- Migration: movies.genre_names / tv_series.genre_names (denormalised genre list)
--
-- The app filters and renders genres straight from movies.genre_names and
-- tv_series.genre_names (browse page, shelves, search_all, similar_*), and the
-- GIN index migrations that follow index those columns. The old database had
-- them added by hand; no migration ever created them, so a fresh project failed
-- with: column "genre_names" does not exist.
--
-- Source of truth stays genres + movie_genres / tv_genres. This migration:
--   1. adds genre_names text[] (default '{}') to movies and tv_series
--   2. adds AFTER INSERT/UPDATE/DELETE row triggers on the join tables that
--      recompute the parent row's genre_names (sorted by name)
--   3. backfills both columns from the join tables
--
-- Triggers are created BEFORE the backfill: CREATE TRIGGER locks the join table
-- until commit, so rows written concurrently are either seen by the backfill or
-- wait and then fire the trigger. Nothing is missed.
-- Idempotent: IF NOT EXISTS / CREATE OR REPLACE / DROP TRIGGER IF EXISTS.

-- ── 1. Columns ────────────────────────────────────────────────────────────────

ALTER TABLE movies    ADD COLUMN IF NOT EXISTS genre_names text[] NOT NULL DEFAULT '{}';
ALTER TABLE tv_series ADD COLUMN IF NOT EXISTS genre_names text[] NOT NULL DEFAULT '{}';

-- ── 2. Sync triggers ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION movie_genres_sync_genre_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DELETE / UPDATE: recompute the old parent (UPDATE may move the row).
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE movies SET genre_names = COALESCE((
      SELECT array_agg(g.name ORDER BY g.name)
      FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
      WHERE mg.movie_id = OLD.movie_id), '{}')
    WHERE id = OLD.movie_id;
  END IF;
  -- INSERT / UPDATE: recompute the new parent.
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE movies SET genre_names = COALESCE((
      SELECT array_agg(g.name ORDER BY g.name)
      FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
      WHERE mg.movie_id = NEW.movie_id), '{}')
    WHERE id = NEW.movie_id;
  END IF;
  RETURN NULL;  -- AFTER trigger: return value ignored
END;
$$;

CREATE OR REPLACE FUNCTION tv_genres_sync_genre_names()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    UPDATE tv_series SET genre_names = COALESCE((
      SELECT array_agg(g.name ORDER BY g.name)
      FROM tv_genres tg JOIN genres g ON g.id = tg.genre_id
      WHERE tg.tv_series_id = OLD.tv_series_id), '{}')
    WHERE id = OLD.tv_series_id;
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    UPDATE tv_series SET genre_names = COALESCE((
      SELECT array_agg(g.name ORDER BY g.name)
      FROM tv_genres tg JOIN genres g ON g.id = tg.genre_id
      WHERE tg.tv_series_id = NEW.tv_series_id), '{}')
    WHERE id = NEW.tv_series_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS movie_genres_sync_genre_names_trigger ON movie_genres;
CREATE TRIGGER movie_genres_sync_genre_names_trigger
  AFTER INSERT OR UPDATE OR DELETE ON movie_genres
  FOR EACH ROW EXECUTE FUNCTION movie_genres_sync_genre_names();

DROP TRIGGER IF EXISTS tv_genres_sync_genre_names_trigger ON tv_genres;
CREATE TRIGGER tv_genres_sync_genre_names_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tv_genres
  FOR EACH ROW EXECUTE FUNCTION tv_genres_sync_genre_names();

-- ── 3. Backfill (rows without genres keep the '{}' default) ──────────────────

UPDATE movies m SET genre_names = s.names
FROM (
  SELECT mg.movie_id, array_agg(g.name ORDER BY g.name) AS names
  FROM movie_genres mg JOIN genres g ON g.id = mg.genre_id
  GROUP BY mg.movie_id
) s
WHERE s.movie_id = m.id;

UPDATE tv_series t SET genre_names = s.names
FROM (
  SELECT tg.tv_series_id, array_agg(g.name ORDER BY g.name) AS names
  FROM tv_genres tg JOIN genres g ON g.id = tg.genre_id
  GROUP BY tg.tv_series_id
) s
WHERE s.tv_series_id = t.id;
