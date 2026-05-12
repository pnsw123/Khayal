"use client";

// ReactBits TiltedCard grid — each poster is a TiltedCard (verbatim ReactBits port)
// Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/TiltedCard/TiltedCard.jsx

import Link from "next/link";
import { TiltedCard } from "./tilted-card";

interface Movie {
  movie_id: number;
  avg_rating: number;
  movies: { title: string; slug: string; poster_url: string };
}

export function FeaturedFilms({ movies }: { movies: Movie[] }) {
  if (movies.length === 0) return null;

  return (
    <section style={{ background: "var(--ink)", paddingBottom: "6rem" }}>
      <div
        className="mx-auto max-w-[1600px] px-6 pt-20 pb-10 flex items-baseline justify-between"
      >
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

      <div
        className="mx-auto max-w-[1600px] px-6"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {movies.map((m) => (
          <Link
            key={m.movie_id}
            href={`/movies/${m.movies.slug}`}
            style={{ display: "block" }}
          >
            <TiltedCard
              imageSrc={m.movies.poster_url}
              altText={m.movies.title}
              captionText={m.movies.title}
              containerHeight="240px"
              containerWidth="100%"
              imageHeight="240px"
              imageWidth="100%"
              scaleOnHover={1.06}
              rotateAmplitude={10}
              showTooltip={true}
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
