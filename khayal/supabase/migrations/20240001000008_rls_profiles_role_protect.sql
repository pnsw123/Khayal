-- Migration: Lock role column against client-side self-promotion (issue #201)
--
-- The existing profiles_update_own policy allowed any authenticated user to
-- UPDATE any column on their own profile row — including the `role` column.
-- This meant any user could call:
--   supabase.from('profiles').update({ role: 'admin' }).eq('id', auth.uid())
-- and immediately promote themselves to admin via the public anon key.
--
-- Fix: replace the permissive WITH CHECK with one that additionally requires
-- the role column to remain unchanged (equal to the current persisted value).
-- Admin promotions must now go through the promoteUser server action which
-- uses the session-cookie client (supabaseServer) and verifies the CALLER is
-- already an admin before issuing the update.
--
-- Idempotent: DROP ... IF EXISTS before CREATE.

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );
