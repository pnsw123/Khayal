export interface SearchFilters {
  type?: "movie" | "tv" | "";
  year?: string;
  genre?: string;
  pageSize?: number;
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

  const body: Record<string, unknown> = {
    query_text: text,
    page_size: filters.pageSize ?? 30,
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/search_all`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) return [];

  const data: SearchResult[] = await res.json().catch(() => []);
  const rows = Array.isArray(data) ? data : [];

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
