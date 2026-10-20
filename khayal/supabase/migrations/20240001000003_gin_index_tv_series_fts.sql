-- Migration: GIN index on tv_series full-text search tsvector
--
-- The search_all RPC uses tsvector full-text search on both movies AND tv_series
-- titles and overviews. The movies table already has idx_movies_fts (migration
-- 20240001000001). Without a matching index on tv_series, every TV search performs
-- a sequential scan across all 7,400+ rows.
--
-- This index fixes issue #167. The expression matches the search_all RPC's
-- tsvector construction for tv_series exactly:
--   to_tsvector('english', title || ' ' || COALESCE(overview, ''))
--
-- No CONCURRENTLY: migrations run inside a transaction, where it is not allowed.
-- IF NOT EXISTS: idempotent — safe to re-run if migration is applied twice.

CREATE INDEX IF NOT EXISTS idx_tv_series_fts
  ON tv_series USING GIN(to_tsvector('english', title || ' ' || COALESCE(overview, '')));
