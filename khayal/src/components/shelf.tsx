import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { MovieCard } from "./movie-card";
import { year } from "@/lib/utils";

/**
 * Minimal shape required by Shelf — satisfied by both Movie and MovieWithGenresRow.
 * id/title/slug are nullable to match Supabase view column inference even though
 * rows always carry real values at runtime.
 */
export type ShelfItem = {
  id: number | null;
  title: string | null;
  slug: string | null;
  release_date: string | null;
  poster_url: string | null;
  runtime_minutes: number | null;
  age_rating: string | null;
  original_language: string | null;
  genre_names?: string[] | null;
};

export interface ShelfProps {
  title: string;
  kicker?: string;      // small Arabic/eyebrow label
  items: ShelfItem[];
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
    <section className="mb-10 md:mb-12">
      <header className="flex items-baseline justify-between gap-4 mb-4">
        <div className="flex items-baseline gap-3 min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-[var(--cream)] underline decoration-[var(--saffron)] decoration-2 underline-offset-[7px]">
            {title}
          </h2>
          {kicker && (
            <span className="font-arabic text-sm text-[var(--cream-muted)]/60">{kicker}</span>
          )}
        </div>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="shrink-0 inline-flex items-center gap-1 text-sm text-white/60 hover:text-white transition-colors duration-150"
          >
            View all <ChevronRight size={14} />
          </Link>
        )}
      </header>

      <div className="relative -mx-4 md:-mx-6 lg:-mx-12 px-4 md:px-6 lg:px-12 overflow-x-auto scroll-smooth snap-x [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-3 md:gap-4 min-w-max pt-1 pb-4">
          {items.filter((m) => m.id != null && m.slug != null).map((m) => (
            <div key={m.id} className="w-[132px] md:w-[164px] shrink-0 snap-start">
              <MovieCard
                title={m.title ?? ""}
                year={year(m.release_date)}
                posterUrl={m.poster_url}
                rating={ratingByMovie?.get(m.id!) ?? null}
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
