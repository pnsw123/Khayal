"use server";
import { supabaseServer } from "@/lib/supabase-server";

export type PromoteUserResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Server action — promote a user's role to 'admin'.
 * Verifies the CALLER is an authenticated admin before issuing the update.
 * Uses supabaseServer() (session-cookie client) — never the public anon key.
 *
 * Fixes issue #201: previously promote-button.tsx used the anon key client-side,
 * which allowed any authenticated user to self-promote via browser devtools.
 */
export async function promoteUser(userId: string): Promise<PromoteUserResult> {
  if (!userId) {
    return { success: false, error: "userId is required." };
  }

  const sb = await supabaseServer();

  // Verify caller is authenticated
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // Verify caller is an admin
  const { data: callerProfile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (callerProfile?.role !== "admin") {
    return { success: false, error: "Admin access required." };
  }

  // Prevent no-op promote of self (admin already)
  if (userId === user.id) {
    return { success: false, error: "Cannot promote yourself." };
  }

  const { error } = await sb
    .from("profiles")
    .update({ role: "admin" })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
