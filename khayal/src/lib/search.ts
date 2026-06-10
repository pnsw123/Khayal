export interface SearchFilters {
  type?: "movie" | "tv" | "";
  year?: string;
  genre?: string;
  pageSize?: number;
  pageOffset?: number;
}

export interface SearchResult {
  id: number;
  type: "movie" | "tv";
  title: string;
  slug: string;
  overview: string | null;
  poster_url: string | null;
  release_year: number | null;
  relevance: number;
  age_rating: string | null;
  original_language: string | null;
  runtime_minutes: number | null;
  genre_names: string[] | null;
}

/** Map decade label → [year_start, year_end] for RPC params. */
function decadeRange(year: string): { start: number | null; end: number | null } {
  switch (year) {
    case "2020s": return { start: 2020, end: null };
    case "2010s": return { start: 2010, end: 2019 };
    case "2000s": return { start: 2000, end: 2009 };
    case "1990s": return { start: 1990, end: 1999 };
    case "older":  return { start: null, end: 1989 };
    default:       return { start: null, end: null };
  }
}

export async function searchAll(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  const { supabaseBrowser } = await import("@/lib/supabase-browser");
  const supabase = supabaseBrowser();

  const { start: p_year_start, end: p_year_end } = filters.year
    ? decadeRange(filters.year)
    : { start: null, end: null };

  const { data, error } = await supabase.rpc("search_all", {
    query_text:   text,
    page_size:    filters.pageSize ?? 30,
    page_offset:  filters.pageOffset ?? 0,
    p_type:       filters.type  || null,
    p_year_start: p_year_start,
    p_year_end:   p_year_end,
    p_genre:      filters.genre || null,
  });

  if (error || !data) return [];

  return Array.isArray(data) ? (data as SearchResult[]) : [];
}

export function buildSearchHref(
  current: URLSearchParams,
  key: string,
  value: string
): string {
  const next = new URLSearchParams(current);
  if (!value) next.delete(key);
  else next.set(key, value);
  const q = next.toString();
  return q ? `/search?${q}` : "/search";
}
