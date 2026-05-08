export type BrowseFilters = {
  genre?: string;
  year?: string;
  lang?: string;
  rating?: string;
  score?: string;
  sort?: string;
  page?: number;
};

export type YearRange = { from: string; to: string };

export const PAGE_SIZE = 96;

export function yearRange(code: string): YearRange | null {
  switch (code) {
    case "2020s": return { from: "2020-01-01", to: "2029-12-31" };
    case "2010s": return { from: "2010-01-01", to: "2019-12-31" };
    case "2000s": return { from: "2000-01-01", to: "2009-12-31" };
    case "1990s": return { from: "1990-01-01", to: "1999-12-31" };
    case "older": return { from: "1900-01-01", to: "1989-12-31" };
    default:      return null;
  }
}

export function resolveSortColumn(sort: string): { column: string; ascending: boolean } {
  switch (sort) {
    case "popular": return { column: "popularity",   ascending: false };
    case "rated":   return { column: "vote_average",  ascending: false };
    case "oldest":  return { column: "release_date",  ascending: true };
    default:        return { column: "release_date",  ascending: false };
  }
}

export type ChainableQuery = {
  contains: (col: string, val: string[]) => ChainableQuery;
  eq: (col: string, val: string) => ChainableQuery;
  gte: (col: string, val: number | string) => ChainableQuery;
  lte: (col: string, val: number | string) => ChainableQuery;
  order: (col: string, opts: { ascending: boolean; nullsFirst: boolean }) => ChainableQuery;
  range: (from: number, to: number) => ChainableQuery;
  not: (col: string, op: string, val: unknown) => ChainableQuery;
};

export function buildBrowseQuery(
  query: ChainableQuery,
  filters: BrowseFilters,
): ChainableQuery {
  let q = query.not("poster_url", "is", null);

  if (filters.genre) {
    q = q.contains("genre_names", [filters.genre]);
  }

  if (filters.lang) {
    q = q.eq("original_language", filters.lang);
  }

  if (filters.rating) {
    q = q.eq("age_rating", filters.rating);
  }

  if (filters.score) {
    const min = Number(filters.score);
    if (!Number.isNaN(min)) {
      q = q.gte("vote_average", min);
    }
  }

  if (filters.year) {
    const range = yearRange(filters.year);
    if (range) {
      q = q.gte("release_date", range.from).lte("release_date", range.to);
    }
  }

  const { column, ascending } = resolveSortColumn(filters.sort ?? "");
  q = q.order(column, { ascending, nullsFirst: false });

  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  q = q.range(from, to);

  return q;
}
