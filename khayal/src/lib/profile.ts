import { supabaseServer } from "./supabase-server";

export interface UserProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface RatingWithMovie {
  rating: number;
  movies: {
    title: string;
    slug: string;
    poster_url: string | null;
    release_date: string | null;
  };
}

export interface ReviewWithMovie {
  id: number;
  body: string;
  headline: string | null;
  created_at: string;
  movies: {
    title: string;
    slug: string;
    poster_url: string | null;
  };
}

export interface PublicList {
  id: number;
  name: string;
  item_count: number;
}

export async function getUserProfile(username: string): Promise<UserProfile | null> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();
  return data ?? null;
}

export async function getUserRatings(userId: string): Promise<RatingWithMovie[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("movie_ratings")
    .select("rating, movies!inner(title, slug, poster_url, release_date)")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(10);
  return (data ?? []) as unknown as RatingWithMovie[];
}

export async function getUserReviews(userId: string): Promise<ReviewWithMovie[]> {
  const sb = await supabaseServer();
  const { data } = await sb
    .from("movie_reviews")
    .select("id, body, headline, created_at, movies!inner(title, slug, poster_url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);
  return (data ?? []) as unknown as ReviewWithMovie[];
}

export async function getUserLists(userId: string): Promise<PublicList[]> {
  const sb = await supabaseServer();
  const { data: lists } = await sb
    .from("user_lists")
    .select("id, name")
    .eq("user_id", userId)
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (!lists || lists.length === 0) return [];

  const listIds = lists.map((l) => l.id);
  const [{ data: movieCounts }, { data: tvCounts }] = await Promise.all([
    sb.from("user_list_movies").select("list_id").in("list_id", listIds),
    sb.from("user_list_tv_series").select("list_id").in("list_id", listIds),
  ]);

  const countMap = new Map<number, number>();
  [...(movieCounts ?? []), ...(tvCounts ?? [])].forEach((r: { list_id: number }) => {
    countMap.set(r.list_id, (countMap.get(r.list_id) ?? 0) + 1);
  });

  return lists.map((l) => ({
    id: l.id,
    name: l.name,
    item_count: countMap.get(l.id) ?? 0,
  }));
}
