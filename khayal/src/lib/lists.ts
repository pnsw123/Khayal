import { supabaseServer } from "./supabase-server";
import type { UserList } from "@/components/add-to-list";

/**
 * Fetch the current user's lists + whether the given target is a member
 * of each. Ensures a "Favorites" list always exists (auto-creates).
 */
export async function loadUserListsForTarget(
  userId: string,
  kind: "movie" | "tv_series",
  targetId: number,
): Promise<UserList[]> {
  const sb = await supabaseServer();
  const bridge = kind === "movie" ? "user_list_movies" : "user_list_tv_series";
  const idField = kind === "movie" ? "movie_id" : "tv_series_id";

  // 1. Load user's lists
  let { data: lists } = await sb
    .from("user_lists")
    .select("id, name, is_favorites, is_public")
    .eq("user_id", userId)
    .order("is_favorites", { ascending: false })
    .order("created_at", { ascending: true });

  // 2. Auto-create Favorites if missing
  const hasFav = (lists ?? []).some((l: { is_favorites: boolean }) => l.is_favorites);
  if (!hasFav) {
    const { data: fav } = await sb
      .from("user_lists")
      .insert({ user_id: userId, name: "Favorites", is_favorites: true, is_public: false })
      .select("id, name, is_favorites, is_public")
      .single();
    if (fav) lists = [fav, ...(lists ?? [])];
  }

  // 3. Membership check for this target
  const listIds = (lists ?? []).map((l: { id: number }) => l.id);
  const { data: membership } = await sb
    .from(bridge)
    .select(`list_id, ${idField}`)
    .in("list_id", listIds.length ? listIds : [-1])
    .eq(idField, targetId);
  const memberSet = new Set((membership ?? []).map((m: { list_id: number }) => m.list_id));

  return (lists ?? []).map((l: { id: number; name: string; is_favorites: boolean; is_public: boolean }) => ({
    id: l.id,
    name: l.name,
    is_favorites: l.is_favorites,
    is_public: l.is_public,
    member: memberSet.has(l.id),
  }));
}
