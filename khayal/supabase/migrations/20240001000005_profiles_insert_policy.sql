-- Migration: Add INSERT policy for profiles table (issue #188)
--
-- The profiles table had SELECT (public) and UPDATE (own) policies but no INSERT
-- policy. Without either an INSERT policy or a handle_new_user DB trigger, a new
-- user signup cannot create their profile row when using the anon key.
--
-- No handle_new_user trigger exists in any migration, so this fix adds the INSERT
-- policy. A user may only insert a row where id = auth.uid() (their own profile).
--
-- Idempotent: DROP POLICY IF EXISTS before CREATE POLICY.

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);
