import { supabaseServer } from "@/lib/supabase-server";
import { MovieCard } from "@/components/movie-card";
import type { Movie } from "@/lib/supabase";
import { year } from "@/lib/utils";

export function RecommendationsSkeleton() {
  return (
    <section className="mb-10" aria-hidden>
      <div className="mb-4 flex items-baseline gap-3">
        <div className="h-6 w-36 rounded bg-[var(--ink-lift)] animate-pulse" />
        <div className="h-4 w-16 rounded bg-[var(--ink-lift)] animate-pulse" />
      </div>
      <div className="flex gap-3 overflow-x-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[140px] sm:w-[160px]">
            <div className="aspect-[2/3] w-full rounded-md bg-[var(--ink-lift)] animate-pulse" />
            <div className="mt-2.5 space-y-1.5">
              <div className="h-3 w-4/5 rounded bg-[var(--ink-lift)] animate-pulse" />
              <div className="h-2.5 w-1/2 rounded bg-[var(--ink-lift)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export async function RecommendationsShelf() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  // Not signed in — render nothing (no layout shift, section simply absent)
  if (!user) return null;

  // Fetch pre-computed recommendations
  const { data: recRows } = await sb
    .from("recommendations")
    .select("movie_id, score")
    .eq("user_id", user.id)
    .order("score", { ascending: false })
    .limit(12);

  let movies: Movie[] = [];

  if (recRows && recRows.length > 0) {
    const ids = recRows.map((r) => r.movie_id as number);
    const { data } = await sb
      .from("movies")
      .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language")
      .in("id", ids);
    const map = new Map((data ?? []).map((m) => [m.id, m as Movie]));
    movies = ids.map((id) => map.get(id)).filter((m): m is Movie => !!m);
  } else {
    // Fallback: top-rated unseen movies
    const { data: seen } = await sb
      .from("movie_ratings")
      .select("movie_id")
      .eq("user_id", user.id);
    const seenIds = new Set((seen ?? []).map((r) => r.movie_id as number));

    const { data: stats } = await sb
      .from("movie_stats")
      .select("movie_id, avg_rating")
      .order("avg_rating", { ascending: false })
      .limit(24);

    const ids = (stats ?? [])
      .map((r) => r.movie_id as number)
      .filter((id) => !seenIds.has(id))
      .slice(0, 12);

    if (ids.length > 0) {
      const { data } = await sb
        .from("movies")
        .select("id, title, slug, release_date, poster_url, runtime_minutes, age_rating, original_language")
        .in("id", ids);
      movies = (data ?? []) as Movie[];
    }
  }

  if (movies.length === 0) return null;

  return (
    <section data-testid="personalised-shelf" className="mb-10">
      <div className="mb-4 flex items-baseline gap-3">
        <h2 className="font-display text-xl text-[var(--cream)]">Picked for you</h2>
        <span className="font-arabic text-sm text-[var(--cream-muted)]/60">مختار لك</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {movies.map((m) => (
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
        ))}
      </div>
    </section>
  );
}
