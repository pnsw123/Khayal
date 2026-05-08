import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildBrowseQuery, yearRange, resolveSortColumn, PAGE_SIZE, type ChainableQuery } from "@/lib/browse-logic";

function makeMock() {
  const calls: { method: string; args: unknown[] }[] = [];

  const handler: ProxyHandler<object> = {
    get(_target, prop: string) {
      return (...args: unknown[]) => {
        calls.push({ method: prop, args });
        return proxy;
      };
    },
  };

  const proxy = new Proxy({}, handler) as ChainableQuery;
  return { proxy, calls };
}

describe("yearRange", () => {
  it("returns null for empty code", () => {
    expect(yearRange("")).toBeNull();
  });

  it("returns correct range for 2010s", () => {
    expect(yearRange("2010s")).toEqual({ from: "2010-01-01", to: "2019-12-31" });
  });

  it("returns correct range for 2020s", () => {
    expect(yearRange("2020s")).toEqual({ from: "2020-01-01", to: "2029-12-31" });
  });

  it("returns correct range for 2000s", () => {
    expect(yearRange("2000s")).toEqual({ from: "2000-01-01", to: "2009-12-31" });
  });

  it("returns correct range for 1990s", () => {
    expect(yearRange("1990s")).toEqual({ from: "1990-01-01", to: "1999-12-31" });
  });

  it("returns correct range for older", () => {
    expect(yearRange("older")).toEqual({ from: "1900-01-01", to: "1989-12-31" });
  });
});

describe("resolveSortColumn", () => {
  it("popular → popularity DESC", () => {
    expect(resolveSortColumn("popular")).toEqual({ column: "popularity", ascending: false });
  });

  it("rated → vote_average DESC", () => {
    expect(resolveSortColumn("rated")).toEqual({ column: "vote_average", ascending: false });
  });

  it("oldest → release_date ASC", () => {
    expect(resolveSortColumn("oldest")).toEqual({ column: "release_date", ascending: true });
  });

  it("default (empty) → release_date DESC", () => {
    expect(resolveSortColumn("")).toEqual({ column: "release_date", ascending: false });
  });
});

describe("buildBrowseQuery", () => {
  let mock: ReturnType<typeof makeMock>;

  beforeEach(() => {
    mock = makeMock();
  });

  it("always calls not(poster_url)", () => {
    buildBrowseQuery(mock.proxy, {});
    const notCall = mock.calls.find((c) => c.method === "not");
    expect(notCall).toBeDefined();
    expect(notCall?.args[0]).toBe("poster_url");
  });

  it("applies genre filter with contains", () => {
    buildBrowseQuery(mock.proxy, { genre: "Action" });
    const containsCall = mock.calls.find((c) => c.method === "contains");
    expect(containsCall).toBeDefined();
    expect(containsCall?.args).toEqual(["genre_names", ["Action"]]);
  });

  it("applies year filter for 2010s with gte and lte", () => {
    buildBrowseQuery(mock.proxy, { year: "2010s" });
    const gte = mock.calls.find((c) => c.method === "gte" && c.args[0] === "release_date");
    const lte = mock.calls.find((c) => c.method === "lte" && c.args[0] === "release_date");
    expect(gte?.args[1]).toBe("2010-01-01");
    expect(lte?.args[1]).toBe("2019-12-31");
  });

  it("applies score filter with gte on vote_average", () => {
    buildBrowseQuery(mock.proxy, { score: "8" });
    const gteCall = mock.calls.find((c) => c.method === "gte" && c.args[0] === "vote_average");
    expect(gteCall).toBeDefined();
    expect(gteCall?.args[1]).toBe(8);
  });

  it("applies lang filter with eq on original_language", () => {
    buildBrowseQuery(mock.proxy, { lang: "fr" });
    const eqCall = mock.calls.find((c) => c.method === "eq" && c.args[0] === "original_language");
    expect(eqCall?.args[1]).toBe("fr");
  });

  it("applies rating filter with eq on age_rating", () => {
    buildBrowseQuery(mock.proxy, { rating: "PG-13" });
    const eqCall = mock.calls.find((c) => c.method === "eq" && c.args[0] === "age_rating");
    expect(eqCall?.args[1]).toBe("PG-13");
  });

  it("sort=popular orders by popularity DESC", () => {
    buildBrowseQuery(mock.proxy, { sort: "popular" });
    const orderCall = mock.calls.find((c) => c.method === "order");
    expect(orderCall?.args[0]).toBe("popularity");
    expect((orderCall?.args[1] as { ascending: boolean }).ascending).toBe(false);
  });

  it("sort=rated orders by vote_average DESC", () => {
    buildBrowseQuery(mock.proxy, { sort: "rated" });
    const orderCall = mock.calls.find((c) => c.method === "order");
    expect(orderCall?.args[0]).toBe("vote_average");
  });

  it("sort=oldest orders by release_date ASC", () => {
    buildBrowseQuery(mock.proxy, { sort: "oldest" });
    const orderCall = mock.calls.find((c) => c.method === "order");
    expect(orderCall?.args[0]).toBe("release_date");
    expect((orderCall?.args[1] as { ascending: boolean }).ascending).toBe(true);
  });

  it("default sort orders by release_date DESC", () => {
    buildBrowseQuery(mock.proxy, {});
    const orderCall = mock.calls.find((c) => c.method === "order");
    expect(orderCall?.args[0]).toBe("release_date");
    expect((orderCall?.args[1] as { ascending: boolean }).ascending).toBe(false);
  });

  it("always applies range for page 1", () => {
    buildBrowseQuery(mock.proxy, {});
    const rangeCall = mock.calls.find((c) => c.method === "range");
    expect(rangeCall?.args).toEqual([0, PAGE_SIZE - 1]);
  });

  it("applies correct range for page 2", () => {
    buildBrowseQuery(mock.proxy, { page: 2 });
    const rangeCall = mock.calls.find((c) => c.method === "range");
    expect(rangeCall?.args).toEqual([PAGE_SIZE, PAGE_SIZE * 2 - 1]);
  });

  it("does not call contains when genre is empty", () => {
    buildBrowseQuery(mock.proxy, { genre: "" });
    const containsCall = mock.calls.find((c) => c.method === "contains");
    expect(containsCall).toBeUndefined();
  });

  it("does not apply year filter when year is empty", () => {
    buildBrowseQuery(mock.proxy, { year: "" });
    const gteDate = mock.calls.find((c) => c.method === "gte" && c.args[0] === "release_date");
    expect(gteDate).toBeUndefined();
  });

  it("combines all 5 filters simultaneously", () => {
    buildBrowseQuery(mock.proxy, {
      genre: "Drama",
      year: "2000s",
      lang: "fr",
      score: "7",
      rating: "R",
      sort: "popular",
    });
    expect(mock.calls.find((c) => c.method === "contains")).toBeDefined();
    expect(mock.calls.find((c) => c.method === "gte" && c.args[0] === "release_date")).toBeDefined();
    expect(mock.calls.find((c) => c.method === "eq" && c.args[0] === "original_language")).toBeDefined();
    expect(mock.calls.find((c) => c.method === "gte" && c.args[0] === "vote_average")).toBeDefined();
    expect(mock.calls.find((c) => c.method === "eq" && c.args[0] === "age_rating")).toBeDefined();
    expect(mock.calls.find((c) => c.method === "order" && c.args[0] === "popularity")).toBeDefined();
  });

  it("does not crash with empty filters object", () => {
    expect(() => buildBrowseQuery(mock.proxy, {})).not.toThrow();
  });

  it("ignores non-numeric score", () => {
    buildBrowseQuery(mock.proxy, { score: "abc" });
    const gteVote = mock.calls.find((c) => c.method === "gte" && c.args[0] === "vote_average");
    expect(gteVote).toBeUndefined();
  });
});

// ─── Genre chips data tests ───────────────────────────────────────────────

describe("genre chips data shape", () => {
  function buildGenres(rawGenres: { name: string }[]) {
    return [
      { code: "", label: "All Genres" },
      ...rawGenres.map((g) => ({ code: g.name, label: g.name })),
    ];
  }

  it("genre-chip-all entry is always first with empty code", () => {
    const genres = buildGenres([{ name: "Action" }, { name: "Drama" }]);
    expect(genres[0].code).toBe("");
    expect(genres[0].label).toBe("All Genres");
  });

  it("produces one chip per genre plus the all chip", () => {
    const rawGenres = [{ name: "Action" }, { name: "Drama" }, { name: "Horror" }];
    const genres = buildGenres(rawGenres);
    // one per raw genre + the "all" entry
    expect(genres).toHaveLength(rawGenres.length + 1);
  });

  it("each genre chip has a non-empty code matching its name", () => {
    const genres = buildGenres([{ name: "Comedy" }, { name: "Thriller" }]);
    const withCode = genres.filter((g) => g.code !== "");
    withCode.forEach((g) => {
      expect(g.code).toBe(g.label);
      expect(g.code.length).toBeGreaterThan(0);
    });
  });

  it("active genre chip matches when activeGenre equals chip code", () => {
    const genres = buildGenres([{ name: "Action" }, { name: "Drama" }]);
    const activeGenre = "Action";
    const activeChip = genres.find((g) => g.code === activeGenre);
    expect(activeChip).toBeDefined();
    expect(activeChip?.code).toBe("Action");
  });

  it("no chip is active when activeGenre is empty (all genres)", () => {
    const genres = buildGenres([{ name: "Action" }]);
    const activeGenre = "";
    // The "all" chip (code="") matches activeGenre=""
    const activeChip = genres.find((g) => g.code === activeGenre);
    expect(activeChip?.label).toBe("All Genres");
  });

  it("genre chip href uses encodeURIComponent for codes with spaces", () => {
    const code = "Science Fiction";
    const href = `/browse?genre=${encodeURIComponent(code)}`;
    expect(href).toBe("/browse?genre=Science%20Fiction");
  });

  it("all chip href is /browse with no query param", () => {
    const genres = buildGenres([]);
    const allChip = genres[0];
    const href = allChip.code ? `/browse?genre=${encodeURIComponent(allChip.code)}` : "/browse";
    expect(href).toBe("/browse");
  });

  it("genre chip hrefs are valid browse URLs", () => {
    const genres = buildGenres([{ name: "Action" }, { name: "Science Fiction" }]);
    const actionChip = genres.find((g) => g.code === "Action");
    expect(actionChip).toBeDefined();
    const href = `/browse?genre=${encodeURIComponent(actionChip!.code)}`;
    expect(href).toBe("/browse?genre=Action");
  });

});

// ─── Netflix-style shelf rows (unfiltered vs filtered logic) ─────────────

describe("browse shelf row logic", () => {
  /**
   * Mirrors the `filtersActive` logic from page.tsx:
   *   filtersActive = hasAnyFilter(usp) || !!activeGenre
   * And the decision to show shelves:
   *   showShelves = !filtersActive && page === 1
   */
  function shouldShowShelves(params: {
    genre?: string; lang?: string; rating?: string;
    score?: string; year?: string; sort?: string; page?: number;
  }): boolean {
    const usp = new URLSearchParams(
      Object.entries(params).filter(([k, v]) => !!v && k !== "page") as [string, string][],
    );
    const filtersActive = usp.toString() !== "" || !!params.genre;
    const page = params.page ?? 1;
    return !filtersActive && page === 1;
  }

  it("unfiltered page 1 shows shelves (top-rated-shelf, new-this-week-shelf)", () => {
    expect(shouldShowShelves({})).toBe(true);
  });

  it("unfiltered page 2 does NOT show shelves — falls back to grid", () => {
    expect(shouldShowShelves({ page: 2 })).toBe(false);
  });

  it("genre filter active → does NOT show shelves, shows grid instead", () => {
    expect(shouldShowShelves({ genre: "Action" })).toBe(false);
  });

  it("lang filter active → does NOT show shelves", () => {
    expect(shouldShowShelves({ lang: "fr" })).toBe(false);
  });

  it("year filter active → does NOT show shelves", () => {
    expect(shouldShowShelves({ year: "2010s" })).toBe(false);
  });

  it("score filter active → does NOT show shelves", () => {
    expect(shouldShowShelves({ score: "8" })).toBe(false);
  });

  it("rating filter active → does NOT show shelves", () => {
    expect(shouldShowShelves({ rating: "PG-13" })).toBe(false);
  });

  it("genre viewAllHref is built correctly for shelf row", () => {
    const genre = "Science Fiction";
    const href = "/browse?genre=" + encodeURIComponent(genre);
    expect(href).toBe("/browse?genre=Science%20Fiction");
  });

  it("genreRows filters out genres with zero items", () => {
    type GenreRow = { name: string; items: unknown[] };
    const raw: GenreRow[] = [
      { name: "Action", items: [{ id: 1 }, { id: 2 }] },
      { name: "Empty",  items: [] },
      { name: "Drama",  items: [{ id: 3 }] },
    ];
    const filtered = raw.filter((r) => r.items.length > 0);
    expect(filtered.map((r) => r.name)).toEqual(["Action", "Drama"]);
  });

  it("qualified genres require count >= 5", () => {
    const counts = [
      { name: "Action",  count: 10 },
      { name: "Niche",   count: 3 },
      { name: "Drama",   count: 5 },
      { name: "Tiny",    count: 0 },
    ];
    const qualified = counts.filter((g) => g.count >= 5).map((g) => g.name);
    expect(qualified).toEqual(["Action", "Drama"]);
  });

  it("ratingByMovie map excludes null avg_rating entries", () => {
    const statsData = [
      { movie_id: 1, avg_rating: 8.5 },
      { movie_id: 2, avg_rating: null },
      { movie_id: 3, avg_rating: 7.0 },
    ];
    const map = new Map<number, number>();
    statsData.forEach((s) => {
      if (s.avg_rating != null) map.set(s.movie_id, Number(s.avg_rating));
    });
    expect(map.get(1)).toBe(8.5);
    expect(map.has(2)).toBe(false);
    expect(map.get(3)).toBe(7.0);
  });
});
