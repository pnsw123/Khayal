import { supabaseServer } from "@/lib/supabase-server";
import { HeroSection } from "@/components/landing/hero-section";
import { FilmTicker } from "@/components/landing/film-ticker";
import { FeaturedFilms } from "@/components/landing/featured-films";
import { StatsSection } from "@/components/landing/stats-section";
import { CTASection } from "@/components/landing/cta-section";

export default async function HomePage() {
  const sb = await supabaseServer();

  const { data: featuredRaw } = await sb
    .from("movie_stats")
    .select("movie_id, avg_rating, movies!inner(title, slug, poster_url)")
    .order("avg_rating", { ascending: false })
    .not("movies.poster_url", "is", null)
    .limit(20);

  const [{ count: filmCount }, { count: ratingCount }, { count: reviewCount }] =
    await Promise.all([
      sb.from("movies").select("*", { count: "exact", head: true }),
      sb.from("movie_ratings").select("*", { count: "exact", head: true }),
      sb.from("movie_reviews").select("*", { count: "exact", head: true }),
    ]);

  // Normalise Supabase join shape — movies can come back as object or array
  const featured = (featuredRaw ?? []).map((row) => {
    const m = Array.isArray(row.movies) ? row.movies[0] : row.movies;
    return {
      movie_id: row.movie_id as number,
      avg_rating: row.avg_rating as number,
      movies: m as { title: string; slug: string; poster_url: string },
    };
  });

  const titles = featured.map((f) => f.movies.title).filter(Boolean);

  return (
    <main>
      <HeroSection />
      {titles.length > 0 && <FilmTicker titles={titles} />}
      <FeaturedFilms movies={featured} />
      <StatsSection
        filmCount={filmCount ?? 0}
        ratingCount={ratingCount ?? 0}
        reviewCount={reviewCount ?? 0}
      />
      <CTASection />
    </main>
  );
}
