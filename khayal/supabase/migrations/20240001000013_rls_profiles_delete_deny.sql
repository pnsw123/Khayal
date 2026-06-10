-- Migration: Explicit DELETE deny policy for profiles table (issue #256)
--
-- PROBLEM:
--   The profiles table has SELECT (public), INSERT (own), and UPDATE (own + role-guard
--   trigger) policies, but no DELETE policy.
--
--   With RLS enabled and no DELETE policy, Postgres uses implicit deny — the operation
--   silently fails for any client using the anon key.  This is safe in practice but:
--
--   1. Not auditable: no named policy to inspect in pg_policies or Supabase dashboard.
--   2. Not testable: structural SQL tests cannot assert a policy exists by name.
--   3. Fragile: if RLS is accidentally disabled (e.g. during a schema migration that
--      re-creates the table), the implicit deny disappears and any authenticated user
--      could delete their own profiles row via the Supabase JS client, orphaning their
--      user_lists, movie_ratings, tv_series_ratings, and recommendations rows.
--
-- DECISION — Option 1: Deny all client-side deletes (USING (false))
--
--   Account deletion is handled exclusively by a server action that uses the Supabase
--   service-role key (which bypasses RLS entirely). There is no self-service profile
--   deletion feature in the codebase, and no such feature is planned at this time.
--
--   USING (false) makes the deny explicit, named, and testable.
--   Service-role deletes are unaffected because service role bypasses RLS.
--
-- IDEMPOTENT: DROP POLICY IF EXISTS before CREATE POLICY.

DROP POLICY IF EXISTS "profiles_delete_deny" ON profiles;
CREATE POLICY "profiles_delete_deny"
  ON profiles FOR DELETE
  USING (false);
