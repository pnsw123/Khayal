import Link from "next/link";
import { X } from "lucide-react";
import { PersonalisedShelf } from "@/components/personalised-shelf";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase";
import { MovieCard } from "@/components/movie-card";
import { FilterDropdown } from "@/components/filter-dropdown";
import { Shelf } from "@/components/shelf";
import { LANGUAGES, RATINGS, YEARS, SCORES, SORT_OPTIONS, hasAnyFilter } from "@/lib/filters";
import { buildBrowseQuery } from "@/lib/browse";
import { year } from "@/lib/utils";

export const revalidate = 300;

type Search = { lang?: string; rating?: string; score?: string; genre?: string; year?: string; sort?: string; page?: string };

const PAGE_SIZE = 96;

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const usp = new URLSearchParams(Object.entries(params).filter(([, v]) => !!v) as [string, string][]);
  const activeLang   = params.lang   ?? "";
  const activeRating = params.rating ?? "";
  const activeScore  = params.score  ?? "";
  const activeGenre  = params.genre  ?? "";
  const activeYear   = params.year   ?? "";
  const activeSort   = params.sort   ?? "";
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

  let gridData: any[] = [];
  let gridTotal = 0;

  {
    const base = sb
      .from("movies_with_genres")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language, genre_names", { count: "exact" });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const q = buildBrowseQuery(base as any, {
      genre:  activeGenre  || undefined,
      lang:   activeLang   || undefined,
      rating: activeRating || undefined,
      score:  activeScore  || undefined,
      year:   activeYear   || undefined,
      sort:   activeSort   || undefined,
      page,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, count } = await (q as any);
    gridData = (data ?? []) as typeof gridData;
    gridTotal = (count as number | null) ?? 0;
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
    <div className="min-h-screen" data-testid="browse-page">
      {/* ─── Filter bar ─── */}
      <div className="border-b border-[var(--ink-high)] bg-[var(--ink)]">
        <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-2.5 flex items-center gap-2 flex-wrap">
          <FilterDropdown label="Genre"    items={genres}        activeCode={activeGenre}  paramKey="genre"  searchParams={usp} />
          <FilterDropdown label="Year"     items={YEARS}         activeCode={activeYear}   paramKey="year"   searchParams={usp} />
          <FilterDropdown label="Language" items={LANGUAGES}     activeCode={activeLang}   paramKey="lang"   searchParams={usp} />
          <FilterDropdown label="Score"    items={SCORES}        activeCode={activeScore}  paramKey="score"  searchParams={usp} />
          <FilterDropdown label="Rating"   items={RATINGS}       activeCode={activeRating} paramKey="rating" searchParams={usp} />
          <FilterDropdown label="Sort"     items={SORT_OPTIONS}  activeCode={activeSort}   paramKey="sort"   searchParams={usp} />
          {filtersActive && (
            <Link href="/browse" className="inline-flex items-center gap-1 h-8 px-2.5 text-[11px] font-mono text-[var(--cream-muted)] hover:text-[var(--cream)] transition-colors">
              <X size={10} /> Clear
            </Link>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-[1600px] px-4 md:px-6 py-8">
        {/* ─── Personalised shelf (client — checks auth on mount) ─── */}
        <PersonalisedShelf />

        {/* ─── Header row ─── */}
        <div className="mb-8">
          <h1 className="font-display text-2xl md:text-3xl text-[var(--cream)]">
            {filtersActive ? "Filtered results" : "Browse films"}
          </h1>
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
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
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

  // Show up to 9 sequential pages centred around current, no ellipsis
  const windowSize = 9;
  let start = Math.max(1, current - Math.floor(windowSize / 2));
  let end   = start + windowSize - 1;
  if (end > total) { end = total; start = Math.max(1, end - windowSize + 1); }
  const withGaps: number[] = [];
  for (let i = start; i <= end; i++) withGaps.push(i);

  return (
    <nav className="mt-10 pt-6 border-t border-[var(--ink-high)] flex items-center justify-center gap-0.5">
      {current > 1 ? (
        <Link href={href(current - 1)} className="h-9 px-3 rounded text-[12px] font-mono border border-[var(--taupe)]/20 text-[var(--cream-muted)] hover:text-[var(--cream)] hover:border-[var(--taupe)]/50 transition-colors flex items-center gap-1">
          ‹ Prev
        </Link>
      ) : (
        <span className="h-9 px-3 rounded text-[12px] font-mono border border-[var(--taupe)]/10 text-[var(--cream-muted)]/25 flex items-center">‹ Prev</span>
      )}
      {withGaps.map((p) => (
        <Link
          key={p}
          href={href(p)}
          className={
            "h-9 min-w-9 px-2.5 rounded text-[12px] font-mono flex items-center justify-center transition-colors " +
            (p === current
              ? "bg-[var(--accent)] text-[var(--ink)] font-semibold"
              : "text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--ink-lift)]")
          }
        >
          {p}
        </Link>
      ))}
      {current < total ? (
        <Link href={href(current + 1)} className="h-9 px-3 rounded text-[12px] font-mono border border-[var(--taupe)]/20 text-[var(--cream-muted)] hover:text-[var(--cream)] hover:border-[var(--taupe)]/50 transition-colors flex items-center gap-1">
          Next ›
        </Link>
      ) : (
        <span className="h-9 px-3 rounded text-[12px] font-mono border border-[var(--taupe)]/10 text-[var(--cream-muted)]/25 flex items-center">Next ›</span>
      )}
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
