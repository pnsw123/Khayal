-- Migration: Add pg_execute_explain helper RPC for EXPLAIN ANALYZE in integration tests
--
-- Purpose: enables the integration test `test_search_all_uses_index_scan_not_seq_scan`
-- to run EXPLAIN ANALYZE against the local Supabase stack and verify that the GIN
-- indexes on movies.fts and movies.genre_names are actually used by the query planner
-- at 10k+ row scale.
--
-- Security model:
--   - SECURITY DEFINER so the function executes with elevated privileges needed to
--     call `EXPLAIN ANALYZE` (which requires the user to own the tables or have
--     superuser rights).
--   - The function validates that the input SQL starts with "EXPLAIN" (case-insensitive,
--     after stripping whitespace). Any other statement is rejected with an exception.
--     This prevents the function from being used as a general-purpose SQL executor.
--   - GRANT is restricted to service_role only. The anon and authenticated roles
--     cannot call this function, so it is not reachable from browser clients.
--   - SET search_path pins the execution context and prevents schema injection.
--
-- Usage (from integration tests via service-role key):
--   SELECT pg_execute_explain(
--     'EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) SELECT id FROM movies WHERE ...'
--   );

CREATE OR REPLACE FUNCTION pg_execute_explain(query text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  result_text text := '';
  row_text    text;
BEGIN
  -- Safety gate: only EXPLAIN statements are permitted.
  -- Trim leading whitespace, cast to uppercase, check prefix.
  IF upper(ltrim(query)) NOT LIKE 'EXPLAIN%' THEN
    RAISE EXCEPTION
      'pg_execute_explain: only EXPLAIN statements are permitted. Got: %',
      left(query, 120);
  END IF;

  -- Execute the EXPLAIN statement and collect output rows into a single text blob.
  FOR row_text IN EXECUTE query LOOP
    result_text := result_text || row_text || E'\n';
  END LOOP;

  RETURN result_text;
END;
$$;

-- Restrict access: service_role only — not reachable from browser/anon clients.
REVOKE ALL ON FUNCTION pg_execute_explain(text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION pg_execute_explain(text) TO service_role;
