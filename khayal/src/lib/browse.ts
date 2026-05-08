import "server-only";
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

export async function loadBrowseRows(): Promise<BrowseRows> {
  const sb = await supabaseServer();
  const today = new Date().toISOString().slice(0, 10);
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10);

  // Load top rated, new this week, and genres in parallel
  const [topRatedResult, newThisWeekResult, genresResult] = await Promise.all([
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
    sb.from("genres").select("id, name").order("name", { ascending: true }),
  ]);

  const topRated: Movie[] = (topRatedResult.data ?? []).map(
    (r: any) => r.movies_with_genres as unknown as Movie,
  );
  const newThisWeek: Movie[] = (newThisWeekResult.data ?? []) as unknown as Movie[];
  const allGenres: { id: number; name: string }[] = (genresResult.data ?? []) as any[];

  // Count films per genre, filter to >= 5
  const countResults = await Promise.all(
    allGenres.map((g) =>
      sb
        .from("movies_with_genres")
        .select("id", { count: "exact", head: true })
        .contains("genre_names", [g.name]),
    ),
  );

  const qualifiedGenres = allGenres.filter(
    (_, i) => (countResults[i].count ?? 0) >= 5,
  );

  // Fetch items for each qualified genre in parallel
  const genreItemResults = await Promise.all(
    qualifiedGenres.map((g) =>
      sb
        .from("movies_with_genres")
        .select(SHELF_SELECT)
        .not("poster_url", "is", null)
        .contains("genre_names", [g.name])
        .order("release_date", { ascending: false })
        .limit(15),
    ),
  );

  const genreRows: GenreRow[] = qualifiedGenres
    .map((g, i) => ({
      name: g.name,
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
  (statsData ?? []).forEach((s: any) => {
    if (s.avg_rating != null) ratingByMovie.set(s.movie_id, Number(s.avg_rating));
  });

  return { topRated, newThisWeek, genreRows, ratingByMovie };
}
