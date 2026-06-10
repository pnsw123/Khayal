-- Migration: GIN index on tv_series.genre_names for fast array containment queries
--
-- The browse page and genre shelves use `@>` (array containment) to filter TV series
-- by genre. Without a GIN index, every query performs a full sequential scan across
-- all TV series rows. The movies table already has idx_movies_genre_names (migration
-- 20240001000000). This migration adds the equivalent index for tv_series.
--
-- Fixes issue #191.
--
-- CONCURRENTLY: safe to run on a live production database without locking.
-- IF NOT EXISTS: idempotent — safe to re-run if migration is applied twice.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tv_series_genre_names
  ON tv_series USING GIN(genre_names);
