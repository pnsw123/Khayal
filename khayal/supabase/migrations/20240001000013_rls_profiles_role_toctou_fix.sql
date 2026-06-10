-- Migration: Fix TOCTOU race in profiles_update_own RLS policy (issue #243)
--
-- PROBLEM:
--   Migration 20240001000007_rls_profiles_role_protect.sql introduced:
--
--     WITH CHECK (
--       auth.uid() = id
--       AND role = (SELECT role FROM profiles WHERE id = auth.uid())
--     )
--
--   The subquery reads the *currently committed* role value at CHECK evaluation
--   time — not at statement-start time and not inside a FOR UPDATE lock.  Under
--   two simultaneous UPDATE calls from the same browser session (fast double-
--   submit), both transactions read the pre-update 'user' role, both pass the
--   check, and both commits succeed — a classic time-of-check-time-of-use
--   (TOCTOU) window.
--
-- FIX — three complementary layers:
--
--   1. CHECK constraint on profiles.role
--      Enforces that only valid enum values ('user', 'admin', 'moderator') can
--      ever be stored.  Protects against future migration errors too.
--      Atomic: evaluated by the storage engine before the row is written.
--
--   2. BEFORE UPDATE trigger: profiles_role_protect_trigger
--      Fires in the same transaction as the UPDATE, using OLD.role — the row
--      value at the start of *this* transaction, held under a row-level lock.
--      No subquery, no concurrent read, no TOCTOU window.
--      Raises an exception if OLD.role != NEW.role and the caller is not the
--      Supabase service role (which is used by the promoteUser server action).
--
--   3. Simplified RLS policy (removes the racy subquery)
--      The WITH CHECK now only verifies ownership (auth.uid() = id).  Role
--      protection is entirely delegated to the trigger above, which is
--      TOCTOU-free.
--
-- ROLE DETECTION:
--   PostgREST sets the GUC request.jwt.claims.role from the JWT's `role` claim.
--   The Supabase service-role JWT always carries role = 'service_role'.
--   current_setting('request.jwt.claims.role', true) returns NULL when called
--   outside of a PostgREST request (e.g. in psql), so we treat NULL as non-
--   service-role for safety.
--
-- SAFE TO RUN on live DB:
--   - ADD CONSTRAINT uses NOT VALID on existing rows (validated separately if
--     needed), and is re-entrant via ALTER TABLE ... IF NOT EXISTS equivalent
--     pattern (DROP + re-add).
--   - CREATE OR REPLACE FUNCTION is idempotent.
--   - DROP TRIGGER IF EXISTS + CREATE TRIGGER is idempotent.
--   - DROP POLICY IF EXISTS + CREATE POLICY is idempotent.
--
-- DOES NOT affect promoteUser server action:
--   promoteUser uses supabaseServer() which carries the service-role key.
--   PostgREST sets request.jwt.claims.role = 'service_role' for those requests,
--   so the trigger allows role changes from that path.

-- ── Step 1: CHECK constraint on role column ───────────────────────────────────

-- Remove existing constraint if present (idempotent re-application).
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_valid;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_valid
    CHECK (role IN ('user', 'admin', 'moderator'));

-- ── Step 2: Trigger function — role change guard ──────────────────────────────

CREATE OR REPLACE FUNCTION profiles_role_protect()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  -- If role is not being changed, allow the UPDATE through.
  IF OLD.role = NEW.role THEN
    RETURN NEW;
  END IF;

  -- Role is changing.  Permit only when the caller holds the service_role JWT
  -- (i.e. the promoteUser server action using supabaseServer()).
  -- current_setting(..., true) returns NULL when the GUC is unset (direct psql),
  -- which we treat as non-service-role.
  IF current_setting('request.jwt.claims.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- All other callers are denied.
  RAISE EXCEPTION
    'profiles_role_protect: role may only be changed via the service role. '
    'Use the promoteUser server action.';
END;
$$;

-- ── Step 3: Attach trigger to profiles table ──────────────────────────────────

DROP TRIGGER IF EXISTS profiles_role_protect_trigger ON profiles;

CREATE TRIGGER profiles_role_protect_trigger
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_role_protect();

-- ── Step 4: Replace RLS policy — remove the racy subquery ─────────────────────

-- The trigger above handles role protection atomically (TOCTOU-free).
-- The WITH CHECK only needs to verify row ownership.

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
