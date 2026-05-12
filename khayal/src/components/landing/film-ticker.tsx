"use client";

import { motion, useReducedMotion } from "motion/react";

interface FilmTickerProps {
  titles: string[];
}

export function FilmTicker({ titles }: FilmTickerProps) {
  const prefersReduced = useReducedMotion();

  const text = titles.join(" · ") + " · ";

  if (prefersReduced) {
    return (
      <div
        className="w-full overflow-hidden py-4"
        style={{ borderTop: "1px solid color-mix(in srgb, var(--taupe) 10%, transparent)", borderBottom: "1px solid color-mix(in srgb, var(--taupe) 10%, transparent)" }}
      >
        <p
          className="font-mono text-[11px] tracking-[0.25em] uppercase text-center truncate"
          style={{ color: "color-mix(in srgb, var(--cream-muted) 40%, transparent)" }}
        >
          {text}
        </p>
      </div>
    );
  }

  return (
    <div
      className="w-full overflow-hidden py-4"
      style={{
        borderTop: "1px solid color-mix(in srgb, var(--taupe) 10%, transparent)",
        borderBottom: "1px solid color-mix(in srgb, var(--taupe) 10%, transparent)",
      }}
      aria-hidden
    >
      <motion.div
        className="flex whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 35, ease: "linear", repeat: Infinity }}
      >
        {[...titles, ...titles].map((title, i) => (
          <span
            key={i}
            className="font-mono text-[11px] tracking-[0.25em] uppercase"
            style={{
              color: "color-mix(in srgb, var(--cream-muted) 40%, transparent)",
              marginRight: "1.5rem",
              flexShrink: 0,
            }}
          >
            {title}
            <span className="mx-3 opacity-50">·</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}
