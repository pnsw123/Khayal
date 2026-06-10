"use server";
import { supabaseServer } from "@/lib/supabase-server";

export type DeleteContentResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Server action — delete a movie or TV series row.
 * Verifies the caller is an authenticated admin before issuing the delete.
 * The DB also enforces this via the movies_delete_admin_only /
 * tv_series_delete_admin_only RLS policies (issue #207).
 */
export async function deleteContent(
  id: number,
  type: "movies" | "tv"
): Promise<DeleteContentResult> {
  const sb = await supabaseServer();

  // Verify authenticated
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated." };
  }

  // Verify admin role
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required." };
  }

  const table = type === "movies" ? "movies" : "tv_series";
  const { error } = await sb.from(table).delete().eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
}
