import { supabaseServer } from "@/lib/supabase-server";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsSection } from "@/components/landing/stats-section";
import { CTASection } from "@/components/landing/cta-section";
import { GallerySection } from "@/components/landing/gallery-section";

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

  const featured = (featuredRaw ?? []).map((row) => {
    const m = Array.isArray(row.movies) ? row.movies[0] : row.movies;
    return {
      movie_id: row.movie_id as number,
      avg_rating: row.avg_rating as number,
      movies: m as { title: string; slug: string; poster_url: string },
    };
  });

  // Proxy TMDB images so WebGL textures can load (CORS fix)
  const galleryItems = featured.map((f) => ({
    image: `/api/image-proxy?url=${encodeURIComponent(f.movies.poster_url)}`,
    text: f.movies.title,
  }));

  return (
    <main>
      {/* Section 1 — Hero */}
      <HeroSection />

      {/* Section 2 — Circular gallery */}
      <GallerySection items={galleryItems} />

      {/* Section 3 — Stats */}
      <StatsSection
        filmCount={filmCount ?? 0}
        ratingCount={ratingCount ?? 0}
        reviewCount={reviewCount ?? 0}
      />

      {/* Section 4 — CTA */}
      <CTASection />
    </main>
  );
}
