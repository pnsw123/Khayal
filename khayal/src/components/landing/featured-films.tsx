"use client";

import Link from "next/link";
import { MasonryGallery } from "./masonry-gallery";

interface Movie {
  movie_id: number;
  avg_rating: number;
  movies: { title: string; slug: string; poster_url: string };
}

export function FeaturedFilms({ movies }: { movies: Movie[] }) {
  const items = movies.map((m, i) => ({
    id: m.movie_id ?? i,
    img: m.movies.poster_url,
    url: `/movies/${m.movies.slug}`,
    height: 600, // poster aspect ~2:3, 300px wide × 2 = 600
  }));

  if (items.length === 0) return null;

  return (
    <section style={{ background: "var(--ink)", paddingBottom: "4rem" }}>
      <div className="mx-auto max-w-[1600px] px-6 pt-20 pb-10 flex items-baseline justify-between">
        <div>
          <p
            className="font-mono text-[10px] tracking-[0.35em] uppercase mb-3"
            style={{ color: "var(--cream-muted)", opacity: 0.5 }}
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
          className="font-mono text-[11px] tracking-[0.25em] uppercase"
          style={{ color: "var(--cream-muted)" }}
        >
          Browse all →
        </Link>
      </div>
      <div className="mx-auto max-w-[1600px] px-6">
        <MasonryGallery
          items={items}
          animateFrom="bottom"
          blurToFocus={true}
          scaleOnHover={true}
          hoverScale={0.97}
          stagger={0.04}
        />
      </div>
    </section>
  );
}
