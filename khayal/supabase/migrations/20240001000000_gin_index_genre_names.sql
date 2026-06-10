-- Migration: GIN index on movies.genre_names for fast array containment queries
--
-- The browse page and genre shelves use `@>` (array containment) to filter films
-- by genre. Without a GIN index, every query performs a full sequential scan
-- across 7400+ rows. With 15-25 genre shelves loaded in parallel on each browse
-- page load, this is 15-25 sequential scans per request.
--
-- CONCURRENTLY: safe to run on a live production database without locking.
-- IF NOT EXISTS: idempotent — safe to re-run if migration is applied twice.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_genre_names
  ON movies USING GIN(genre_names);
