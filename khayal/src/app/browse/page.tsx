import Link from "next/link";
import { Suspense } from "react";
import { X } from "lucide-react";
import { RecommendationsShelf, RecommendationsSkeleton } from "@/components/recommendations-shelf";
import { Shelf } from "@/components/shelf";
import { supabaseServer } from "@/lib/supabase-server";

import type { MovieWithGenresRow } from "@/lib/database.types";
import { MovieCard } from "@/components/movie-card";
import { FilterDropdown } from "@/components/filter-dropdown";
import { PosterCarousel } from "@/components/poster-carousel";
import { FeaturedReel } from "@/components/featured-reel";
import { LANGUAGES, RATINGS, YEARS, SCORES, SORT_OPTIONS, hasAnyFilter } from "@/lib/filters";
import { buildBrowseQuery, loadBrowseRows } from "@/lib/browse";
import { year } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";

export const revalidate = 300;

type Search = { lang?: string; rating?: string; score?: string; genre?: string; year?: string; sort?: string; page?: string };

const PAGE_SIZE = 96;

interface FeaturedMovie {
  id: number;
  title: string;
  slug: string;
  release_date: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  overview: string | null;
}

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
  const genres = [
    { code: "", label: "All Genres" },
    ...(genreRows ?? []).map((g: { id: number; name: string; slug: string }) => ({ code: g.name, label: g.name })),
  ];
  type GridRow = MovieWithGenresRow;
  let gridData: GridRow[] = [];
  let gridTotal = 0;

  {
    const base = sb
      .from("movies_with_genres")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language, genre_names", { count: "exact" });
    const q = buildBrowseQuery(base as import("@/lib/browse-logic").ChainableQuery, {
      genre:  activeGenre  || undefined,
      lang:   activeLang   || undefined,
      rating: activeRating || undefined,
      score:  activeScore  || undefined,
      year:   activeYear   || undefined,
      sort:   activeSort   || undefined,
      page,
    });
    const { data, count } = await (q as unknown as Promise<{ data: GridRow[] | null; count: number | null }>);
    gridData = (data ?? []);
    gridTotal = count ?? 0;
  }

  const grid = gridData;
  const totalPages = Math.max(1, Math.ceil((gridTotal ?? 0) / PAGE_SIZE));

  const idList: number[] = gridData.map((m) => m.id).filter((id): id is number => id != null);
  const { data: stats } = await sb
    .from("movie_stats")
    .select("movie_id, avg_rating")
    .in("movie_id", idList.length ? idList : [-1]);
  const ratingByMovie = new Map<number, number>();
  (stats ?? []).forEach((s) => { if (s.movie_id != null && s.avg_rating != null) ratingByMovie.set(s.movie_id, Number(s.avg_rating)); });

  // Load shelf rows only when not filtered
  const browseRows = !filtersActive && page === 1 ? await loadBrowseRows() : null;

  // Fetch backdrop + overview for top 3 rated — used by FeaturedReel hero section
  let featuredMovies: FeaturedMovie[] = [];
  if (browseRows && browseRows.topRated.length > 0) {
    const topIds = browseRows.topRated.slice(0, 3).map((m) => m.id).filter((id): id is number => id != null);
    const { data: featuredRaw } = await sb
      .from("movies")
      .select("id, title, slug, release_date, poster_url, backdrop_url, overview")
      .in("id", topIds);
    if (featuredRaw) {
      // Preserve top-rated order
      const byId = new Map((featuredRaw as FeaturedMovie[]).map((m) => [m.id, m]));
      featuredMovies = topIds.map((id) => byId.get(id)).filter((m): m is FeaturedMovie => !!m);
    }
  }

  const REEL_KICKERS: { en: string; ar: string }[] = [
    { en: "REEL 01", ar: "البكرة الأولى" },
    { en: "REEL 02", ar: "البكرة الثانية" },
    { en: "REEL 03", ar: "البكرة الثالثة" },
  ];

  return (
    <div className="min-h-screen" data-testid="browse-page">
      {/* ─── Filter bar ─── */}
      <div className="bg-[var(--ink)]">
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
        {/* ─── Personalised shelf — streams from server, no pop-in ─── */}
        <Suspense fallback={<RecommendationsSkeleton />}>
          <RecommendationsShelf />
        </Suspense>

        {browseRows ? (
          /* ─── Unfiltered: Netflix-style genre rows ─── */
          <>
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl text-[var(--cream)]">Browse films</h1>
            </div>

            {/* ─── Tonight's Projections — FeaturedReel hero cards ─── */}
            {featuredMovies.length > 0 && (
              <section className="mb-12" data-testid="featured-reels">
                <div className="mb-5 flex items-baseline gap-3">
                  <h2 className="font-mono text-[11px] tracking-[0.3em] uppercase text-[var(--saffron)]">
                    TONIGHT&apos;S PROJECTIONS
                  </h2>
                  <span className="font-arabic text-sm text-[var(--saffron)]/60">عروض الليلة</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredMovies.map((m, i) => (
                    <FeaturedReel
                      key={m.id}
                      kicker={REEL_KICKERS[i]?.en ?? `REEL 0${i + 1}`}
                      kickerArabic={REEL_KICKERS[i]?.ar ?? ""}
                      title={m.title}
                      year={year(m.release_date)}
                      posterUrl={m.poster_url}
                      backdropUrl={m.backdrop_url}
                      overview={m.overview}
                      href={`/movies/${m.slug}`}
                      size={i === 0 ? "lg" : i === 1 ? "md" : "sm"}
                    />
                  ))}
                </div>
              </section>
            )}

            {browseRows.topRated.length > 0 && (
              <div data-testid="top-rated-shelf">
                <Shelf
                  title="Top Rated"
                  kicker="الأعلى تقييماً"
                  items={browseRows.topRated}
                  ratingByMovie={browseRows.ratingByMovie}
                  viewAllHref="/browse?sort=rated"
                />
              </div>
            )}

            {browseRows.newThisWeek.length > 0 && (
              <div data-testid="new-this-week-shelf">
                <PosterCarousel
                  title="New This Week — جديد هذا الأسبوع"
                  items={browseRows.newThisWeek
                    .filter((m): m is typeof m & { slug: string; title: string } => m.slug != null && m.title != null)
                    .map((m) => ({
                      slug: m.slug,
                      title: m.title,
                      poster_url: m.poster_url ?? null,
                      href: `/movies/${m.slug}`,
                    }))}
                />
              </div>
            )}

            {browseRows.genreRows.map((gr) => (
              <Shelf
                key={gr.name}
                title={gr.name}
                items={gr.items}
                ratingByMovie={browseRows.ratingByMovie}
                viewAllHref={"/browse?genre=" + encodeURIComponent(gr.name)}
              />
            ))}
          </>
        ) : (
          /* ─── Filtered: existing grid ─── */
          <>
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl text-[var(--cream)]">
                Filtered results
              </h1>
            </div>

            <section id="films" data-testid="filtered-grid">
              {grid.length === 0 ? (
                <EmptyState
                  arabicLabel="لا خيال هنا"
                  title="Nothing matches."
                  subtitle="Try loosening a filter."
                />
              ) : (
                <>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
                    {grid
                      .filter((m): m is typeof m & { id: number; title: string; slug: string } => m.id != null && m.title != null && m.slug != null)
                      .map((m) => (
                        <MovieCard
                          key={m.id}
                          title={m.title}
                          year={year(m.release_date)}
                          posterUrl={m.poster_url}
                          rating={ratingByMovie.get(m.id) ?? null}
                          href={`/movies/${m.slug}`}
                          genres={m.genre_names ?? []}
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
          </>
        )}
      </div>
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────

function Pagination({
  current, total, searchParams, totalRows: _totalRows,
}: { current: number; total: number; searchParams: URLSearchParams; totalRows: number }) {
  const href = (p: number) => {
    const next = new URLSearchParams(searchParams);
    if (p === 1) next.delete("page"); else next.set("page", String(p));
    const q = next.toString();
    return q ? `/browse?${q}` : "/browse";
  };

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
