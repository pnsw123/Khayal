"use client";
import Link from "next/link";
import { CircularGallery } from "./circular-gallery";

interface Movie {
  movie_id: number;
  avg_rating: number;
  movies: { title: string; slug: string; poster_url: string };
}

interface FeaturedFilmsProps {
  movies: Movie[];
}

export function FeaturedFilms({ movies }: FeaturedFilmsProps) {
  const items = movies.map((m) => ({
    image: m.movies.poster_url,
    text: m.movies.title,
  }));

  return (
    <section style={{ background: "var(--ink)" }}>
      {/* Section header */}
      <div className="mx-auto max-w-[1400px] px-6 pt-20 pb-8 flex items-baseline justify-between">
        <div>
          <p
            className="font-mono text-[10px] tracking-[0.35em] uppercase mb-3"
            style={{ color: "var(--cream-muted)", opacity: 0.6 }}
          >
            Top rated
          </p>
          <h2
            className="font-display text-4xl md:text-5xl"
            style={{ color: "var(--cream)", letterSpacing: "-0.02em" }}
          >
            Now Showing
          </h2>
        </div>
        <Link
          href="/browse?sort=rated"
          className="font-mono text-[11px] tracking-[0.25em] uppercase transition-colors"
          style={{ color: "var(--cream-muted)" }}
        >
          Browse all →
        </Link>
      </div>

      {/* CircularGallery — full width, tall */}
      <div style={{ height: "500px", width: "100%" }}>
        <CircularGallery
          items={items}
          bend={3}
          textColor="#eeeef8"
          borderRadius={0.08}
          font="bold 22px monospace"
          scrollSpeed={2}
          scrollEase={0.06}
        />
      </div>
    </section>
  );
}
