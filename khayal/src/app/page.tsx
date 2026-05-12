import { supabaseServer } from "@/lib/supabase-server";
import { HeroSection } from "@/components/landing/hero-section";
import { StatsSection } from "@/components/landing/stats-section";
import { CTASection } from "@/components/landing/cta-section";
import { ScrollStack, ScrollStackItem } from "@/components/landing/scroll-stack";
import { CircularGallery } from "@/components/landing/circular-gallery";

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

  // Proxy TMDB images through /api/image-proxy so WebGL textures can load (CORS fix)
  const galleryItems = featured.map((f) => ({
    image: `/api/image-proxy?url=${encodeURIComponent(f.movies.poster_url)}`,
    text: f.movies.title,
  }));

  return (
    <ScrollStack
      useWindowScroll={true}
      itemDistance={0}
      itemScale={0.04}
      itemStackDistance={20}
      stackPosition="15%"
      scaleEndPosition="8%"
      baseScale={0.88}
      blurAmount={1}
    >
      {/* Section 1 — Hero */}
      <ScrollStackItem>
        <HeroSection />
      </ScrollStackItem>

      {/* Section 2 — Circular Gallery (ReactBits CircularGallery + image proxy for CORS) */}
      <ScrollStackItem>
        <section
          style={{
            minHeight: "100vh",
            background: "var(--ink)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <div className="mx-auto max-w-[1600px] px-6 pt-16 pb-8">
            <p
              className="font-mono text-[10px] tracking-[0.35em] uppercase mb-3"
              style={{ color: "var(--cream-muted)", opacity: 0.5 }}
            >
              Most acclaimed
            </p>
            <h2
              className="font-display text-4xl md:text-6xl"
              style={{ color: "var(--cream)", letterSpacing: "-0.02em" }}
            >
              Now Showing
            </h2>
          </div>
          <div style={{ flex: 1, minHeight: "60vh", width: "100%" }}>
            {galleryItems.length > 0 && (
              <CircularGallery
                items={galleryItems}
                bend={3}
                textColor="var(--cream-muted)"
                borderRadius={0.05}
                font="bold 18px monospace"
                scrollSpeed={2}
                scrollEase={0.05}
              />
            )}
          </div>
        </section>
      </ScrollStackItem>

      {/* Section 3 — Stats */}
      <ScrollStackItem>
        <StatsSection
          filmCount={filmCount ?? 0}
          ratingCount={ratingCount ?? 0}
          reviewCount={reviewCount ?? 0}
        />
      </ScrollStackItem>

      {/* Section 4 — CTA */}
      <ScrollStackItem>
        <CTASection />
      </ScrollStackItem>
    </ScrollStack>
  );
}
