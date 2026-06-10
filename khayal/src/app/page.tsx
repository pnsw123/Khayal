import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase-server";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsSection } from "@/components/landing/stats-section";
import { CTASection } from "@/components/landing/cta-section";
import { GallerySection } from "@/components/landing/gallery-section";
import { ScrollReveal } from "@/components/landing/scroll-reveal";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  // Supabase email-confirmation / OAuth links sometimes redirect to the Site
  // URL root (`/`) with the auth `?code=` attached instead of `/auth/callback`
  // (e.g. when /auth/callback is not in the project's allowed Redirect URLs).
  // Forward it to the callback handler so the session is actually exchanged —
  // otherwise the user lands back on the homepage still logged out.
  const sp = await searchParams;
  if (sp.code) {
    redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  }
  if (sp.error) {
    redirect(`/login?error=${encodeURIComponent(sp.error_description ?? sp.error)}`);
  }

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
      {/* Section 1 — Hero (above the fold, animates on load) */}
      <HeroSection />

      {/* Section 2 — Circular gallery */}
      <ScrollReveal>
        <GallerySection items={galleryItems} />
      </ScrollReveal>

      {/* Section 3 — Stats */}
      <ScrollReveal>
        <StatsSection
          filmCount={filmCount ?? 0}
          ratingCount={ratingCount ?? 0}
          reviewCount={reviewCount ?? 0}
        />
      </ScrollReveal>

      {/* Section 4 — CTA */}
      <ScrollReveal>
        <CTASection />
      </ScrollReveal>
    </main>
  );
}
