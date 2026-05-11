import Link from "next/link";
import { X } from "lucide-react";
import { PersonalisedShelf } from "@/components/personalised-shelf";
import { Shelf } from "@/components/shelf";
import { supabaseServer } from "@/lib/supabase-server";
import type { Movie } from "@/lib/supabase";
import { MovieCard } from "@/components/movie-card";
import { FilterDropdown } from "@/components/filter-dropdown";
import { PosterCarousel } from "@/components/PosterCarousel";
import { LANGUAGES, RATINGS, YEARS, SCORES, SORT_OPTIONS, hasAnyFilter } from "@/lib/filters";
import { buildBrowseQuery, loadBrowseRows } from "@/lib/browse";
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
  const genres = [
    { code: "", label: "All Genres" },
    ...(genreRows ?? []).map((g: any) => ({ code: g.name, label: g.name })),
  ];
  const today = new Date().toISOString().slice(0, 10);

  let gridData: any[] = [];
  let gridTotal = 0;

  {
    const base = sb
      .from("movies_with_genres")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language, genre_names", { count: "exact" });
    const q = buildBrowseQuery(base as any, {
      genre:  activeGenre  || undefined,
      lang:   activeLang   || undefined,
      rating: activeRating || undefined,
      score:  activeScore  || undefined,
      year:   activeYear   || undefined,
      sort:   activeSort   || undefined,
      page,
    });
    const { data, count } = await (q as any);
    gridData = (data ?? []) as typeof gridData;
    gridTotal = (count as number | null) ?? 0;
  }

  const grid = gridData as (Movie & { genre_names: string[] })[];
  const totalPages = Math.max(1, Math.ceil((gridTotal ?? 0) / PAGE_SIZE));

  const idList = (gridData ?? []).map((m: any) => m.id);
  const { data: stats } = await sb
    .from("movie_stats")
    .select("movie_id, avg_rating")
    .in("movie_id", idList.length ? idList : [-1]);
  const ratingByMovie = new Map<number, number>();
  (stats ?? []).forEach((s: any) => { if (s.avg_rating != null) ratingByMovie.set(s.movie_id, Number(s.avg_rating)); });

  // Load shelf rows only when not filtered
  const browseRows = !filtersActive && page === 1 ? await loadBrowseRows() : null;

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

        {browseRows ? (
          /* ─── Unfiltered: Netflix-style genre rows ─── */
          <>
            <div className="mb-8">
              <h1 className="font-display text-2xl md:text-3xl text-[var(--cream)]">Browse films</h1>
            </div>

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
                  items={browseRows.newThisWeek.map((m) => ({
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
          </>
        )}
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
