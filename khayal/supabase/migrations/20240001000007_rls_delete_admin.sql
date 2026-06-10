-- Migration: Admin-only DELETE policies for movies and tv_series (issue #207)
--
-- Problem:
--   movies and tv_series had only SELECT policies. No explicit DELETE policy existed.
--   delete-content-button.tsx was using the anon key directly from the browser,
--   relying on implicit RLS rejection — silent failure from the UI perspective.
--
-- Fix:
--   1. Add admin-only DELETE policy for movies
--   2. Add admin-only DELETE policy for tv_series
--   3. The component has been updated to use a server action (not this migration's scope)
--
-- Admin is defined as: profiles.role = 'admin' for the currently authenticated user.
-- Idempotent: DROP POLICY IF EXISTS before each CREATE POLICY.

-- ── movies (admin-only DELETE) ────────────────────────────────────────────────

DROP POLICY IF EXISTS "movies_delete_admin_only" ON movies;
CREATE POLICY "movies_delete_admin_only"
  ON movies FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );

-- ── tv_series (admin-only DELETE) ─────────────────────────────────────────────

DROP POLICY IF EXISTS "tv_series_delete_admin_only" ON tv_series;
CREATE POLICY "tv_series_delete_admin_only"
  ON tv_series FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'admin'
    )
  );
