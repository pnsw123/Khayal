import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Movie } from "@/lib/supabase";
import { MovieCard } from "./movie-card";
import { year } from "@/lib/utils";

export type MovieWithGenres = Movie & { genre_names?: string[] | null };

export interface ShelfProps {
  title: string;
  kicker?: string;      // small Arabic/eyebrow label
  items: MovieWithGenres[];
  /** Optional "view all" URL with filters applied. */
  viewAllHref?: string;
  /** Ratings map: movieId -> avg_rating. */
  ratingByMovie?: Map<number, number>;
}

/**
 * Horizontal scrolling shelf of movie cards. A library shelf, not a hero.
 * Dense, browsable, with a "view all" CTA on the right.
 */
export function Shelf({ title, kicker, items, viewAllHref, ratingByMovie }: ShelfProps) {
  if (items.length === 0) return null;
  return (
    <section className="mb-14">
      <header className="flex items-baseline justify-between gap-4 mb-5">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-xl md:text-2xl text-[var(--cream)]">
            {title}
          </h2>
          {kicker && (
            <span className="font-arabic text-sm text-[var(--cream-muted)]/50">{kicker}</span>
          )}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 text-[11px] font-mono tracking-[0.2em] uppercase text-[var(--cream-muted)] hover:text-[var(--saffron)] transition-colors"
          >
            View all <ArrowRight size={11} />
          </Link>
        )}
      </header>

      <div className="relative -mx-4 md:-mx-6 px-4 md:px-6 overflow-x-auto scroll-smooth snap-x [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-4 md:gap-5 min-w-max pb-4">
          {items.map((m) => (
            <div key={m.id} className="w-[150px] md:w-[170px] shrink-0 snap-start">
              <MovieCard
                title={m.title}
                year={year(m.release_date)}
                posterUrl={m.poster_url}
                rating={ratingByMovie?.get(m.id) ?? null}
                href={`/movies/${m.slug}`}
                genres={m.genre_names ?? []}
                language={m.original_language}
                runtime={m.runtime_minutes}
                ageRating={m.age_rating}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
