import "server-only";
import { unstable_cache } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase";

// Re-export pure helpers so callers can still import from "@/lib/browse"
export {
  buildBrowseQuery,
  yearRange,
  resolveSortColumn,
  PAGE_SIZE,
  type BrowseFilters,
  type YearRange,
  type ChainableQuery,
} from "@/lib/browse-logic";

const SHELF_SELECT =
  "id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language, genre_names";

export interface GenreRow {
  name: string;
  items: Movie[];
}

export interface BrowseRows {
  topRated: Movie[];
  newThisWeek: Movie[];
  genreRows: GenreRow[];
  ratingByMovie: Map<number, number>;
}

/**
 * Returns genre names that have ≥5 films, cached for 5 minutes.
 *
 * Genre counts change rarely (daily syncs at most), so caching eliminates
 * the N+1 count queries that previously fired on every browse page load.
 * Uses a plain anon client (no cookies) because genre counts are public data.
 */
const loadQualifiedGenreNames = unstable_cache(
  async (): Promise<string[]> => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return [];

    const sb = createClient(url, key);

    // Single query: fetch all genre names, then count per genre via
    // the genre_names array column. One round-trip replaces N count queries.
    const { data } = await sb
      .from("movies_with_genres")
      .select("genre_names")
      .not("poster_url", "is", null);

    if (!data) return [];

    const counts = new Map<string, number>();
    for (const row of data as { genre_names: string[] | null }[]) {
      for (const g of row.genre_names ?? []) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .filter(([, c]) => c >= 5)
      .map(([name]) => name)
      .sort();
  },
  ["browse-qualified-genres"],
  { revalidate: 300, tags: ["browse-genres"] },
);

export async function loadBrowseRows(): Promise<BrowseRows> {
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

  // Resolve qualified genres from cache (single query, cached 5 min)
  // in parallel with top-rated and new-this-week shelf queries.
  const [topRatedResult, newThisWeekResult, qualifiedGenreNames] = await Promise.all([
    sb
      .from("movie_stats")
      .select(`movie_id, avg_rating, movies_with_genres!inner(${SHELF_SELECT})`)
      .not("movies_with_genres.poster_url", "is", null)
      .gt("avg_rating", 0)
      .order("avg_rating", { ascending: false })
      .limit(15),
    sb
      .from("movies_with_genres")
      .select(SHELF_SELECT)
      .not("poster_url", "is", null)
      .gte("release_date", fourteenDaysAgo)
      .lte("release_date", today)
      .order("release_date", { ascending: false })
      .limit(15),
    loadQualifiedGenreNames(),
  ]);

  const topRated: Movie[] = (topRatedResult.data ?? []).map(
    (r: { movies_with_genres: unknown }) => r.movies_with_genres as unknown as Movie,
  );
  const newThisWeek: Movie[] = (newThisWeekResult.data ?? []) as unknown as Movie[];

  // Fetch items for each qualified genre in parallel
  const genreItemResults = await Promise.all(
    qualifiedGenreNames.map((name) =>
      sb
        .from("movies_with_genres")
        .select(SHELF_SELECT)
        .not("poster_url", "is", null)
        .contains("genre_names", [name])
        .order("release_date", { ascending: false })
        .limit(15),
    ),
  );

  const genreRows: GenreRow[] = qualifiedGenreNames
    .map((name, i) => ({
      name,
      items: (genreItemResults[i].data ?? []) as unknown as Movie[],
    }))
    .filter((r) => r.items.length > 0);

  // Build ratingByMovie map covering all shelves
  const allIds = [
    ...topRated.map((m) => m.id),
    ...newThisWeek.map((m) => m.id),
    ...genreRows.flatMap((r) => r.items.map((m) => m.id)),
  ];
  const uniqueIds = [...new Set(allIds)];

  const { data: statsData } = await sb
    .from("movie_stats")
    .select("movie_id, avg_rating")
    .in("movie_id", uniqueIds.length ? uniqueIds : [-1]);

  const ratingByMovie = new Map<number, number>();
  (statsData ?? []).forEach((s: { movie_id: number; avg_rating: number | null }) => {
    if (s.avg_rating != null) ratingByMovie.set(s.movie_id, Number(s.avg_rating));
  });

  return { topRated, newThisWeek, genreRows, ratingByMovie };
}
