import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase-types";

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
  const parsedLimit = limitParam ? parseInt(limitParam, 10) : NaN;
  const limit = Number.isFinite(parsedLimit) && parsedLimit > 0
    ? Math.min(parsedLimit, 100)
    : DEFAULT_LIMIT;
  const algoFilter = req.nextUrl.searchParams.get("algo") ?? undefined;

  // Note: `algo` and `generated_at` columns do not exist on `recommendations`.
  // The `source` column serves as the algorithm identifier; `created_at` as the
  // generation timestamp. The response shape is kept the same for API consumers.
  let recQuery = sb
    .from("recommendations")
    .select("movie_id, score, source, created_at")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(limit);

  if (algoFilter) {
    recQuery = recQuery.eq("source", algoFilter);
  }

  const { data: recRows, error: recError } = await recQuery;

  if (recError) {
    console.error("[recommendations] recQuery error:", recError.message);
    return NextResponse.json(
      { error: `Supabase query failed: ${recError.message}` },
      { status: 500 },
    );
  }

  const algo = recRows?.[0]?.source ?? algoFilter ?? "unknown";
  const generated_at = recRows?.[0]?.created_at ?? new Date().toISOString();

  if (recRows && recRows.length > 0) {
    const movieIds = recRows.map((r) => r.movie_id as number);

    const { data: movies, error: moviesError } = await sb
      .from("movies")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language")
      .in("id", movieIds);

    if (moviesError) {
      console.error("[recommendations] movies fetch error:", moviesError.message);
      return NextResponse.json(
        { error: `Supabase query failed: ${moviesError.message}` },
        { status: 500 },
      );
    }

    const movieMap = new Map<number, Movie>((movies ?? []).map((m) => [m.id, m as Movie]));
    const ordered = movieIds
      .map((id) => movieMap.get(id))
      .filter((m): m is Movie => m !== undefined);

    return NextResponse.json({ movies: ordered, algo, generated_at });
  }

  // Fallback — single RPC: top-rated movies not yet seen by the user.
  // Replaces the previous 3-round-trip path (fetch seen set, fetch limit*10 stats,
  // fetch movie details) with one DB call that pushes the NOT EXISTS filter
  // server-side and applies LIMIT p_limit inside the query (issue #255).
  const { data: fallbackRows, error: fallbackError } = await sb
    .rpc("get_fallback_recommendations", { p_user_id: user.id, p_limit: limit });

  if (fallbackError) {
    console.error("[recommendations] fallback RPC error:", fallbackError.message);
    return NextResponse.json(
      { error: `Supabase query failed: ${fallbackError.message}` },
      { status: 500 },
    );
  }

  if (!fallbackRows || fallbackRows.length === 0) {
    return NextResponse.json({ movies: [], algo: "fallback", generated_at: new Date().toISOString() });
  }

  // Strip avg_rating from the response — Movie type doesn't include it.
  const fallbackMovies = fallbackRows.map(({ avg_rating: _avg, ...m }) => m as Movie);

  return NextResponse.json({
    movies: fallbackMovies,
    algo: "fallback",
    generated_at: new Date().toISOString(),
  });
}
