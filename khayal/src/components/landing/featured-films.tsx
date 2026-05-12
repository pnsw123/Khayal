"use client";

import Link from "next/link";
import { useRef, useState, useCallback } from "react";
import { motion, useSpring, useInView, useReducedMotion } from "motion/react";

interface Movie {
  movie_id: number;
  avg_rating: number;
  movies: {
    title: string;
    slug: string;
    poster_url: string;
  };
}

interface FeaturedFilmsProps {
  movies: Movie[];
}

function TiltedCard({ movie, index }: { movie: Movie; index: number }) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [hovered, setHovered] = useState(false);

  const rotateX = useSpring(0, { stiffness: 300, damping: 30 });
  const rotateY = useSpring(0, { stiffness: 300, damping: 30 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      rotateX.set(-dy * 8);
      rotateY.set(dx * 8);
    },
    [prefersReduced, rotateX, rotateY]
  );

  const handleMouseLeave = useCallback(() => {
    rotateX.set(0);
    rotateY.set(0);
    setHovered(false);
  }, [rotateX, rotateY]);

  const { title, slug, poster_url } = movie.movies;
  const rating = movie.avg_rating?.toFixed(1) ?? "—";

  return (
    <motion.div
      ref={ref}
      initial={prefersReduced ? {} : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link href={`/movies/${slug}`} tabIndex={0}>
        <motion.div
          className="relative rounded-md overflow-hidden cursor-pointer"
          style={{
            aspectRatio: "2/3",
            transformStyle: "preserve-3d",
            rotateX: prefersReduced ? 0 : rotateX,
            rotateY: prefersReduced ? 0 : rotateY,
          }}
          onMouseMove={handleMouseMove}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={handleMouseLeave}
        >
          {/* Poster */}
          <img
            src={poster_url}
            alt={title}
            className="w-full h-full object-cover"
            loading="lazy"
          />

          {/* Overlay */}
          <motion.div
            className="absolute inset-0 flex flex-col justify-end p-3"
            style={{
              background: "linear-gradient(to top, rgba(8,8,14,0.92) 0%, rgba(8,8,14,0.3) 50%, transparent 100%)",
            }}
            animate={{ opacity: hovered ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
          >
            <p
              className="font-display text-sm leading-tight line-clamp-2"
              style={{ color: "var(--cream)" }}
            >
              {title}
            </p>
            <div className="flex items-center gap-1 mt-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="var(--saffron)" aria-hidden>
                <path d="M5 1l1.12 2.27L9 3.64 6.99 5.6l.47 2.74L5 6.99 2.54 8.34 3 5.6 1 3.64l2.88-.37L5 1z" />
              </svg>
              <span
                className="font-mono text-[10px] tracking-wider"
                style={{ color: "var(--saffron-glow)" }}
              >
                {rating}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </Link>
    </motion.div>
  );
}

export function FeaturedFilms({ movies }: FeaturedFilmsProps) {
  const headingRef = useRef<HTMLDivElement>(null);
  const headingInView = useInView(headingRef, { once: true });

  return (
    <section
      className="mx-auto max-w-[1600px] px-6 py-20"
      style={{ color: "var(--cream)" }}
    >
      {/* Heading */}
      <motion.div
        ref={headingRef}
        className="flex items-baseline gap-3 mb-10"
        initial={{ opacity: 0, y: 16 }}
        animate={headingInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-3xl" style={{ color: "var(--cream)" }}>
          Now Showing
        </h2>
        <span
          className="font-arabic text-sm"
          style={{ color: "color-mix(in srgb, var(--cream-muted) 60%, transparent)" }}
        >
          ما يُعرض الآن
        </span>
      </motion.div>

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {movies.map((movie, i) => (
          <TiltedCard key={movie.movie_id} movie={movie} index={i} />
        ))}
      </div>

      {/* Browse all */}
      <div className="mt-10 text-right">
        <Link
          href="/browse"
          className="font-mono text-[11px] tracking-[0.25em] uppercase transition-colors"
          style={{ color: "var(--cream-muted)" }}
        >
          Browse all films →
        </Link>
      </div>
    </section>
  );
}
