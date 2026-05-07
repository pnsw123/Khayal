import Link from "next/link";
import { Search, X } from "lucide-react";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase";
import { MovieCard } from "@/components/movie-card";
import { FilterChips } from "@/components/filter-chips";
import { Shelf } from "@/components/shelf";
import { LANGUAGES, RATINGS, hasAnyFilter } from "@/lib/filters";
import { year } from "@/lib/utils";

export const revalidate = 300;

type Search = { lang?: string; rating?: string; genre?: string; page?: string };

const PAGE_SIZE = 48;

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const usp = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
  const activeLang   = params.lang   ?? "";
  const activeRating = params.rating ?? "";
  const activeGenre  = params.genre  ?? "";
  const page         = Math.max(1, Number(params.page ?? "1") || 1);
  const filtersActive = hasAnyFilter(usp) || !!activeGenre;

  const sb = await supabaseServer();

  // Fetch genres for filter row
  const { data: genreRows } = await sb
    .from("genres")
    .select("id, name, slug")
    .order("name", { ascending: true });
  // Use genre name as code — lets us filter with .contains() on the genre_names[] array in the view
  const genres = [
    { code: "", label: "All Genres" },
    ...(genreRows ?? []).map((g: any) => ({ code: g.name, label: g.name })),
  ];
  const today = new Date().toISOString().slice(0, 10);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString().slice(0, 10);

  // Only show shelves on first page with no filter — page 2+ is pure deep-browse mode
  const showShelves = !filtersActive && page === 1;
  const shelfQueries = showShelves
    ? await loadShelves(sb, today, sixtyDaysAgo)
    : { nowPlaying: null, upcoming: null, classics: null, world: null, recent: null, totals: null };

  // Deep browse grid — genre filter uses movie_genres bridge
  const from = (page - 1) * PAGE_SIZE;
  const to   = from + PAGE_SIZE - 1;

  let gridData: any[] = [];
  let gridTotal = 0;

  // Single query path — genre filter uses .contains() on genre_names[] array column
  {
    let q = sb
      .from("movies_with_genres")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language, genre_names", { count: "exact" })
      .not("poster_url", "is", null)
      .order("release_date", { ascending: false, nullsFirst: false })
      .range(from, to);
    if (activeGenre)  q = q.contains("genre_names", [activeGenre]);
    if (activeLang)   q = q.eq("original_language", activeLang);
    if (activeRating) q = q.eq("age_rating", activeRating);
    const { data, count } = await q;
    gridData = data ?? [];
    gridTotal = count ?? 0;
  }

  const grid = gridData as (Movie & { genre_names: string[] })[];
  const totalPages = Math.max(1, Math.ceil((gridTotal ?? 0) / PAGE_SIZE));

  // Stats shared across rendered cards
  const allIds = new Set<number>();
  (gridData ?? []).forEach((m: any) => allIds.add(m.id));
  if (shelfQueries.nowPlaying) shelfQueries.nowPlaying.forEach((m: any) => allIds.add(m.id));
  if (shelfQueries.upcoming)   shelfQueries.upcoming.forEach((m: any)   => allIds.add(m.id));
  if (shelfQueries.classics)   shelfQueries.classics.forEach((m: any)   => allIds.add(m.id));
  if (shelfQueries.world)      shelfQueries.world.forEach((m: any)      => allIds.add(m.id));
  if (shelfQueries.recent)     shelfQueries.recent.forEach((m: any)     => allIds.add(m.id));

  const idList = Array.from(allIds);
  const { data: stats } = await sb
    .from("movie_stats")
    .select("movie_id, avg_rating")
    .in("movie_id", idList.length ? idList : [-1]);
  const ratingByMovie = new Map<number, number>();
  (stats ?? []).forEach((s: any) => { if (s.avg_rating != null) ratingByMovie.set(s.movie_id, Number(s.avg_rating)); });

  const totals = shelfQueries.totals;

  return (
    <div className="min-h-screen">
      {/* ─── Filter bar — top of browse, not sticky ─── */}
      <div className="border-b border-[var(--ink-high)] bg-[var(--ink)]">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-2 space-y-1.5">
          {/* Row 1: Genre — horizontal scroll, no wrap */}
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            <span className="shrink-0 font-mono text-[9px] tracking-widest uppercase text-[var(--cream-muted)] w-12">Genre</span>
            <FilterChips items={genres} activeCode={activeGenre} paramKey="genre" searchParams={usp} className="flex-nowrap" />
          </div>
          {/* Row 2: Lang + Rating on same line */}
          <div className="flex items-center gap-2 overflow-x-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
            <span className="shrink-0 font-mono text-[9px] tracking-widest uppercase text-[var(--cream-muted)] w-12">Lang</span>
            <FilterChips items={LANGUAGES} activeCode={activeLang} paramKey="lang" searchParams={usp} className="flex-nowrap" />
            <span className="shrink-0 w-px h-3 bg-[var(--ink-high)] mx-1" />
            <span className="shrink-0 font-mono text-[9px] tracking-widest uppercase text-[var(--cream-muted)]">Rating</span>
            <FilterChips items={RATINGS} activeCode={activeRating} paramKey="rating" searchParams={usp} className="flex-nowrap" />
            {filtersActive && (
              <Link href="/browse" className="ml-2 shrink-0 inline-flex items-center gap-1 text-[10px] font-mono uppercase text-[var(--cream-muted)] hover:text-[var(--saffron)] transition-colors">
                <X size={10} /> Clear
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
        {/* ─── Header row with search ─── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl md:text-3xl text-[var(--cream)]">
              {filtersActive ? "Filtered results" : "Browse films"}
            </h1>
            {totals && !filtersActive && (
              <p className="mt-1 font-mono text-[11px] tracking-[0.15em] text-[var(--cream-muted)]">
                {totals.movies.toLocaleString()} films · {totals.tv.toLocaleString()} series
              </p>
            )}
            {filtersActive && (
              <p className="mt-1 font-mono text-[11px] tracking-[0.15em] text-[var(--cream-muted)]">
                {gridTotal.toLocaleString()} results
              </p>
            )}
          </div>
          <Link
            href="/search"
            className="flex items-center gap-3 h-10 pl-4 pr-4 rounded-md bg-[var(--ink-lift)] border border-[var(--ink-high)] text-[var(--cream-muted)] hover:text-[var(--cream)] hover:border-[var(--taupe)] transition-colors w-full sm:w-[320px]"
          >
            <Search size={14} className="text-[var(--saffron)] shrink-0" />
            <span className="flex-1 text-sm text-left truncate">Search films & series…</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[var(--ink-high)] text-[var(--cream-muted)] shrink-0">⌘K</kbd>
          </Link>
        </div>

        {/* ─── Shelves (only on page 1 with no filter) ─── */}
        {showShelves && shelfQueries.nowPlaying && (
          <>
            <Shelf
              title="New Releases"
              kicker="إصدارات جديدة"
              items={shelfQueries.nowPlaying}
              ratingByMovie={ratingByMovie}
            />
            <Shelf
              title="Coming Soon"
              kicker="قريبًا"
              items={shelfQueries.upcoming!}
              ratingByMovie={ratingByMovie}
            />
            <Shelf
              title="World Cinema"
              kicker="سينما العالم"
              items={shelfQueries.world!}
              ratingByMovie={ratingByMovie}
            />
            <Shelf
              title="The Classics"
              kicker="الكلاسيكيات"
              items={shelfQueries.classics!}
              ratingByMovie={ratingByMovie}
            />
          </>
        )}

        {/* ─── Grid ─── */}
        <section id="films" className={showShelves ? "mt-12 pt-10 border-t border-[var(--ink-high)]" : ""}>
          {showShelves && (
            <h2 className="font-display text-xl text-[var(--cream)] mb-6">All films</h2>
          )}

          {grid.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-arabic text-3xl text-[var(--saffron)]/50 mb-3">لا خيال هنا</p>
              <p className="font-display italic text-xl text-[var(--cream)]/70">Nothing matches.</p>
              <p className="mt-2 text-sm text-[var(--cream-muted)]">Try loosening a filter.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-5">
                {grid.map((m) => (
                  <MovieCard
                    key={m.id}
                    title={m.title}
                    year={year(m.release_date)}
                    posterUrl={m.poster_url}
                    rating={ratingByMovie.get(m.id) ?? null}
                    href={`/movies/${m.slug}`}
                    genres={(m as any).genre_names ?? []}
                    language={m.original_language}
                    runtime={m.runtime_minutes}
                    ageRating={m.age_rating}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <Pagination current={page} total={totalPages} searchParams={usp} totalRows={gridTotal ?? 0} />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────

function Pagination({
  current, total, searchParams, totalRows,
}: { current: number; total: number; searchParams: URLSearchParams; totalRows: number }) {
  const href = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p === 1) next.delete("page"); else next.set("page", String(p));
    const q = next.toString();
    return q ? `/browse?${q}` : "/browse";
  };

  // Show: first 2, current ± 2, last 2
  const pages: (number | "…")[] = [];
  const seen = new Set<number>();
  const add = (n: number) => { if (n >= 1 && n <= total && !seen.has(n)) { pages.push(n); seen.add(n); } };
  add(1); add(2);
  add(current - 2); add(current - 1); add(current); add(current + 1); add(current + 2);
  add(total - 1); add(total);
  pages.sort((a, b) => (a as number) - (b as number));
  const withGaps: (number | "…")[] = [];
  let prev = 0;
  for (const p of pages) {
    if (typeof p === "number") {
      if (prev && p - prev > 1) withGaps.push("…");
      withGaps.push(p);
      prev = p;
    }
  }

  return (
    <nav className="mt-14 flex items-center justify-between gap-4 pt-8 border-t border-[var(--taupe)]/15">
      <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">
        Page {current} of {total} · {totalRows.toLocaleString()} titles
      </p>
      <div className="flex items-center gap-1">
        {current > 1 && (
          <Link href={href(current - 1)} className="h-9 px-3 rounded-sm text-xs font-mono tracking-wider uppercase border border-[var(--taupe)]/25 text-[var(--cream-muted)] hover:text-[var(--cream)] hover:border-[var(--saffron)]/50 transition-colors flex items-center">
            ← Prev
          </Link>
        )}
        {withGaps.map((p, i) => p === "…" ? (
          <span key={`g${i}`} className="px-2 text-[var(--cream-muted)] text-sm">…</span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            className={
              "h-9 min-w-9 px-3 rounded-sm text-xs font-mono flex items-center justify-center transition-colors " +
              (p === current
                ? "bg-[var(--saffron)] text-[var(--ink)]"
                : "border border-[var(--taupe)]/25 text-[var(--cream-muted)] hover:text-[var(--cream)] hover:border-[var(--saffron)]/50")
            }
          >
            {p}
          </Link>
        ))}
        {current < total && (
          <Link href={href(current + 1)} className="h-9 px-3 rounded-sm text-xs font-mono tracking-wider uppercase border border-[var(--taupe)]/25 text-[var(--cream-muted)] hover:text-[var(--cream)] hover:border-[var(--saffron)]/50 transition-colors flex items-center">
            Next →
          </Link>
        )}
      </div>
    </nav>
  );
}

// ─── Data loader for the shelves ─────────────────────────────────────────

const SHELF_SELECT = "id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language, genre_names";

async function loadShelves(sb: any, today: string, sixtyDaysAgo: string) {
  const [
    { data: nowPlaying },
    { data: upcoming },
    { data: classics },
    { data: world },
    { data: recent },
    { count: movieTotal },
    { count: tvTotal },
    { count: upcomingCount },
    { count: classicsCount },
  ] = await Promise.all([
    sb.from("movies_with_genres")
      .select(SHELF_SELECT)
      .not("poster_url", "is", null)
      .gte("release_date", sixtyDaysAgo)
      .lte("release_date", today)
      .order("release_date", { ascending: false })
      .limit(15),
    sb.from("movies_with_genres")
      .select(SHELF_SELECT)
      .not("poster_url", "is", null)
      .gt("release_date", today)
      .order("release_date", { ascending: true })
      .limit(15),
    sb.from("movies_with_genres")
      .select(SHELF_SELECT)
      .not("poster_url", "is", null)
      .lt("release_date", "2000-01-01")
      .order("release_date", { ascending: false })
      .limit(15),
    sb.from("movies_with_genres")
      .select(SHELF_SELECT)
      .not("poster_url", "is", null)
      .neq("original_language", "en")
      .order("release_date", { ascending: false })
      .limit(15),
    sb.from("movies_with_genres")
      .select(SHELF_SELECT)
      .not("poster_url", "is", null)
      .order("created_at", { ascending: false })
      .limit(15),
    sb.from("movies").select("*", { count: "exact", head: true }).not("poster_url", "is", null),
    sb.from("tv_series").select("*", { count: "exact", head: true }).not("poster_url", "is", null),
    sb.from("movies").select("*", { count: "exact", head: true }).not("poster_url", "is", null).gt("release_date", today),
    sb.from("movies").select("*", { count: "exact", head: true }).not("poster_url", "is", null).lt("release_date", "2000-01-01"),
  ]);
  return {
    nowPlaying: nowPlaying as Movie[],
    upcoming:   upcoming as Movie[],
    classics:   classics as Movie[],
    world:      world as Movie[],
    recent:     recent as Movie[],
    totals: {
      movies: movieTotal ?? 0,
      tv: tvTotal ?? 0,
      upcoming: upcomingCount ?? 0,
      classics: classicsCount ?? 0,
    },
  };
}
