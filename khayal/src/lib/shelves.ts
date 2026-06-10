import "server-only";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase-types";

const SHELF_SELECT =
  "id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language";

export async function getTrending(): Promise<Movie[]> {
  const sb = await supabaseServer();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);

  const { data } = await sb
    .from("movies_with_genres")
    .select(SHELF_SELECT)
    .not("poster_url", "is", null)
    .gte("created_at", thirtyDaysAgo)
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(20);

  return (data ?? []) as Movie[];
}

export async function getNowPlaying(): Promise<Movie[]> {
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

  const { data } = await sb
    .from("movies_with_genres")
    .select(SHELF_SELECT)
    .not("poster_url", "is", null)
    .gte("release_date", sixtyDaysAgo)
    .lte("release_date", today)
    .order("release_date", { ascending: false })
    .limit(20);

  return (data ?? []) as Movie[];
}

export async function getUpcoming(): Promise<Movie[]> {
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const ninetyDaysAhead = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);

  const { data } = await sb
    .from("movies_with_genres")
    .select(SHELF_SELECT)
    .not("poster_url", "is", null)
    .gt("release_date", today)
    .lte("release_date", ninetyDaysAhead)
    .order("release_date", { ascending: true })
    .limit(20);

  return (data ?? []) as Movie[];
}
