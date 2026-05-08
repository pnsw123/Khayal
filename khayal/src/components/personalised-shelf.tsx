"use client";

import { useEffect, useState } from "react";
import { MovieCard } from "@/components/movie-card";
import { supabaseBrowser } from "@/lib/supabase-browser";
import type { Movie } from "@/lib/supabase";
import { year } from "@/lib/utils";

interface RecsResponse {
  movies: Movie[];
  algo: string;
}

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 w-[140px] sm:w-[160px]">
      <div className="aspect-[2/3] w-full rounded-md bg-[var(--ink-lift)] animate-pulse" />
      <div className="mt-2.5 space-y-1.5">
        <div className="h-3 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-[var(--ink-lift)] animate-pulse" />
      </div>
    </div>
  );
}

export function PersonalisedShelf() {
  const [movies, setMovies] = useState<Movie[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const sb = supabaseBrowser();

    sb.auth.getUser().then(({ data: { user } }: { data: { user: import("@supabase/supabase-js").User | null } }) => {
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      fetch("/api/recommendations?limit=12")
        .then((res) => (res.ok ? res.json() : Promise.resolve({ movies: [] })))
        .then((body: RecsResponse) => setMovies(body.movies ?? []))
        .catch(() => setMovies([]))
        .finally(() => setLoading(false));
    });
  }, []);

  if (!signedIn) return null;

  return (
    <section data-testid="personalised-shelf" className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-xl text-[var(--cream)]">Picked for you</h2>
        <span className="font-arabic text-sm text-[var(--saffron)]/60">مختار لك</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)
        ) : movies && movies.length > 0 ? (
          movies.map((m) => (
            <div key={m.id} className="flex-shrink-0 w-[140px] sm:w-[160px]">
              <MovieCard
                title={m.title}
                year={year(m.release_date)}
                posterUrl={m.poster_url}
                href={`/movies/${m.slug}`}
                language={m.original_language}
                runtime={m.runtime_minutes}
                ageRating={m.age_rating}
              />
            </div>
          ))
        ) : (
          <p className="font-sans text-sm text-[var(--cream-muted)] py-6">
            Rate more films to unlock personalised picks.
          </p>
        )}
      </div>
    </section>
  );
}
