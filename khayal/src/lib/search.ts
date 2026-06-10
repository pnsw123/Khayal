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


function rankResults(results: SearchResult[], query: string): SearchResult[] {
  const q = query.toLowerCase();
  return [...results].sort((a, b) => {
    const aTitle = a.title.toLowerCase();
    const bTitle = b.title.toLowerCase();
    const aExact = aTitle === q ? 2 : aTitle.startsWith(q) ? 1 : 0;
    const bExact = bTitle === q ? 2 : bTitle.startsWith(q) ? 1 : 0;
    if (aExact !== bExact) return bExact - aExact;
    if (a.type !== b.type) return a.type === "movie" ? -1 : 1;
    return b.relevance - a.relevance;
  });
}

export async function searchAll(
  query: string,
  filters: SearchFilters = {}
): Promise<SearchResult[]> {
  const text = query.trim();
  if (text.length < 2) return [];

  const { supabaseBrowser } = await import("@/lib/supabase-browser");
  const supabase = supabaseBrowser();

  const { data, error } = await supabase.rpc("search_all", {
    query_text: text,
    page_size: filters.pageSize ?? 30,
    page_offset: filters.pageOffset ?? 0,
  });

  if (error || !data) return [];

  const rows = Array.isArray(data) ? (data as SearchResult[]) : [];

  const filtered = rows.filter((r) => {
    if (filters.type && r.type !== filters.type) return false;
    if (filters.year) {
      const yr = r.release_year ?? 0;
      if (filters.year === "2020s" && !(yr >= 2020)) return false;
      if (filters.year === "2010s" && !(yr >= 2010 && yr < 2020)) return false;
      if (filters.year === "2000s" && !(yr >= 2000 && yr < 2010)) return false;
      if (filters.year === "1990s" && !(yr >= 1990 && yr < 2000)) return false;
      if (filters.year === "older" && !(yr < 1990)) return false;
    }
    if (filters.genre) {
      const genres = r.genre_names ?? [];
      if (!genres.some((g) => g.toLowerCase() === filters.genre!.toLowerCase())) return false;
    }
    return true;
  });

  return rankResults(filtered, text);
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
