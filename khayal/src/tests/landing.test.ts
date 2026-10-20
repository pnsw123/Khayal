import { describe, it, expect } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { getLandingData, POSTER_LIMIT, FEATURED_LIMIT } from "@/lib/landing";

interface MovieRow {
  id: number;
  title: string;
  slug: string | null;
  release_date: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
}

interface Result {
  data: MovieRow[] | null;
  count: number | null;
  error: null;
}

/** Minimal chainable stand-in for the PostgREST query builder. */
function fakeSb(movies: MovieRow[], counts: Record<string, number>) {
  const calls: { table: string; order?: string; limit?: number }[] = [];
  function from(table: string) {
    const call: { table: string; order?: string; limit?: number } = { table };
    calls.push(call);
    let head = false;
    const builder = {
      select(_cols: string, opts?: { count?: string; head?: boolean }) {
        head = !!opts?.head;
        return builder;
      },
      not() {
        return builder;
      },
      order(col: string) {
        call.order = col;
        return builder;
      },
      limit(n: number) {
        call.limit = n;
        return builder;
      },
      then<T>(onFulfilled: (r: Result) => T) {
        const r: Result = head
          ? { data: null, count: counts[table] ?? 0, error: null }
          : { data: movies, count: null, error: null };
        return Promise.resolve(r).then(onFulfilled);
      },
    };
    return builder;
  }
  return { client: { from } as unknown as SupabaseClient<Database>, calls };
}

const ROWS: MovieRow[] = [
  { id: 1, title: "The Devil Wears Prada", slug: "the-devil-wears-prada", release_date: "2006-06-29", poster_url: "https://image.tmdb.org/p1.jpg", backdrop_url: null },
  { id: 2, title: "No Slug", slug: null, release_date: "2020-01-01", poster_url: "https://image.tmdb.org/p2.jpg", backdrop_url: "https://image.tmdb.org/b2.jpg" },
  { id: 3, title: "Tayuan 2", slug: "tayuan-2", release_date: null, poster_url: "https://image.tmdb.org/p3.jpg", backdrop_url: "https://image.tmdb.org/b3.jpg" },
];

describe("getLandingData", () => {
  it("maps poster rows, dropping ones without a slug, and extracts the year", async () => {
    const { client } = fakeSb(ROWS, {});
    const data = await getLandingData(client);
    expect(data.posters).toEqual([
      { id: 1, title: "The Devil Wears Prada", slug: "the-devil-wears-prada", year: "2006", posterUrl: "https://image.tmdb.org/p1.jpg" },
      { id: 3, title: "Tayuan 2", slug: "tayuan-2", year: null, posterUrl: "https://image.tmdb.org/p3.jpg" },
    ]);
  });

  it("returns films / series / people counts", async () => {
    const { client } = fakeSb(ROWS, { movies: 8105, tv_series: 2980, people: 13086 });
    const data = await getLandingData(client);
    expect(data.counts).toEqual({ films: 8105, series: 2980, people: 13086 });
  });

  it("picks the first poster row that has a backdrop", async () => {
    const { client } = fakeSb(ROWS, {});
    const data = await getLandingData(client);
    expect(data.backdrop).toEqual({ url: "https://image.tmdb.org/b2.jpg", title: "No Slug" });
  });

  it("builds hero slides only from rows with both a slug and a backdrop", async () => {
    const { client } = fakeSb(ROWS, {});
    const data = await getLandingData(client);
    expect(data.featured).toEqual([
      { id: 3, title: "Tayuan 2", slug: "tayuan-2", year: null, overview: null, runtime: null, ageRating: null, backdropUrl: "https://image.tmdb.org/b3.jpg" },
    ]);
  });

  it("caps hero slides at FEATURED_LIMIT", async () => {
    const many = Array.from({ length: 9 }, (_, i) => ({
      id: i, title: `T${i}`, slug: `t-${i}`, release_date: "2024-01-01",
      poster_url: `https://image.tmdb.org/p${i}.jpg`, backdrop_url: `https://image.tmdb.org/b${i}.jpg`,
    }));
    const { client } = fakeSb(many, {});
    const data = await getLandingData(client);
    expect(data.featured).toHaveLength(FEATURED_LIMIT);
    expect(data.featured[0].year).toBe("2024");
  });

  it("returns null backdrop and empty posters when nothing comes back", async () => {
    const { client } = fakeSb([], {});
    const data = await getLandingData(client);
    expect(data.posters).toEqual([]);
    expect(data.featured).toEqual([]);
    expect(data.backdrop).toBeNull();
    expect(data.counts).toEqual({ films: 0, series: 0, people: 0 });
  });

  it("orders by popularity and caps at POSTER_LIMIT", async () => {
    const { client, calls } = fakeSb(ROWS, {});
    await getLandingData(client);
    const posterCall = calls.find((c) => c.limit !== undefined);
    expect(posterCall?.table).toBe("movies");
    expect(posterCall?.order).toBe("popularity");
    expect(posterCall?.limit).toBe(POSTER_LIMIT);
  });
});
