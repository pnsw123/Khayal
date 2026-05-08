import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase";

const DEFAULT_LIMIT = 12;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const sb = await supabaseServer();

  const {
    data: { user },
  } = await sb.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limitParam = req.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : DEFAULT_LIMIT;
  const algoFilter = req.nextUrl.searchParams.get("algo") ?? undefined;

  let recQuery = sb
    .from("recommendations")
    .select("movie_id, score, algo, generated_at")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(limit);

  if (algoFilter) {
    recQuery = recQuery.eq("algo", algoFilter);
  }

  const { data: recRows } = await recQuery;

  const algo = recRows?.[0]?.algo ?? algoFilter ?? "cornac-als";
  const generated_at = recRows?.[0]?.generated_at ?? new Date().toISOString();

  if (recRows && recRows.length > 0) {
    const movieIds = recRows.map((r) => r.movie_id as number);

    const { data: movies } = await sb
      .from("movies")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language")
      .in("id", movieIds);

    const movieMap = new Map<number, Movie>((movies ?? []).map((m) => [m.id, m as Movie]));
    const ordered = movieIds
      .map((id) => movieMap.get(id))
      .filter((m): m is Movie => m !== undefined);

    return NextResponse.json({ movies: ordered, algo, generated_at });
  }

  // Fallback — top-rated movies not yet seen by the user
  const { data: seenRows } = await sb
    .from("movie_ratings")
    .select("movie_id")
    .eq("user_id", user.id);

  const seenIds = (seenRows ?? []).map((r) => r.movie_id as number);

  let fallbackQuery = sb
    .from("movie_stats")
    .select("movie_id, avg_rating")
    .order("avg_rating", { ascending: false })
    .limit(limit * 2);

  const { data: statRows } = await fallbackQuery;

  const candidateIds = (statRows ?? [])
    .map((r) => r.movie_id as number)
    .filter((id) => !seenIds.includes(id))
    .slice(0, limit);

  if (candidateIds.length === 0) {
    return NextResponse.json({ movies: [], algo: "fallback", generated_at: new Date().toISOString() });
  }

  const { data: fallbackMovies } = await sb
    .from("movies")
    .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language")
    .in("id", candidateIds);

  return NextResponse.json({
    movies: fallbackMovies ?? [],
    algo: "fallback",
    generated_at: new Date().toISOString(),
  });
}
