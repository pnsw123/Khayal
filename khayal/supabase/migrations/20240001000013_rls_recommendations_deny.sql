-- ── recommendations: explicit deny policies (issue #257) ─────────────────────
-- INSERT/UPDATE/DELETE are handled by the ML pipeline via SUPABASE_SERVICE_ROLE_KEY,
-- which bypasses RLS entirely. Rather than relying on the implicit deny from the
-- absence of a permissive policy, we add explicit DENY policies so that the intent
-- is auditable and resistant to accidental future policy additions.
--
-- WITH CHECK (false)  — blocks INSERT via authenticated/anon roles
-- USING (false)       — blocks UPDATE and DELETE via authenticated/anon roles

DROP POLICY IF EXISTS "recommendations_insert_deny" ON recommendations;
CREATE POLICY "recommendations_insert_deny"
  ON recommendations FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "recommendations_update_deny" ON recommendations;
CREATE POLICY "recommendations_update_deny"
  ON recommendations FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "recommendations_delete_deny" ON recommendations;
CREATE POLICY "recommendations_delete_deny"
  ON recommendations FOR DELETE
  USING (false);
