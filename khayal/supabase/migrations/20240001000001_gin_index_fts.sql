-- Migration: GIN index on movies full-text search tsvector
--
-- The search_all RPC uses tsvector full-text search on movie titles and overviews.
-- A GIN index on the computed tsvector enables index scans instead of seq scans
-- for all text search queries.
--
-- The expression matches the search_all RPC's tsvector construction exactly:
--   to_tsvector('english', title || ' ' || COALESCE(overview, ''))
--
-- CONCURRENTLY: safe to run on a live production database without locking.
-- IF NOT EXISTS: idempotent — safe to re-run if migration is applied twice.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_movies_fts
  ON movies USING GIN(to_tsvector('english', title || ' ' || COALESCE(overview, '')));
