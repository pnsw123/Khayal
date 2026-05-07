"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

export interface FeaturedReelProps {
  kicker: string;        // "REEL 01"
  kickerArabic: string;  // "البكرة الأولى"
  title: string;
  year: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  overview: string | null;
  href: string;
  size: "lg" | "md" | "sm";
}

/**
 * The asymmetric "Tonight's projections" card. Larger than MovieCards,
 * pulls the backdrop in as ambient. Three sizes so they stack cinematically.
 */
export function FeaturedReel({
  kicker, kickerArabic, title, year, posterUrl, backdropUrl, overview, href, size,
}: FeaturedReelProps) {
  const aspect =
    size === "lg" ? "aspect-[4/5] md:aspect-[3/4]" :
    size === "md" ? "aspect-[4/5]" :
                    "aspect-[4/5]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        href={href}
        className={`group relative block overflow-hidden rounded-sm border border-[var(--taupe)]/15 hover:border-[var(--saffron)]/40 transition-colors ${aspect}`}
      >
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-40 group-hover:opacity-55 group-hover:scale-[1.03] transition-all duration-[900ms] ease-out"
          />
        ) : posterUrl ? (
          <img
            src={posterUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-30 scale-110 blur-sm"
          />
        ) : null}

        {/* Ink gradient + saffron edge glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/98 via-[var(--ink)]/70 to-[var(--ink)]/20" />
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--ink)]/40 via-transparent to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--saffron)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative h-full p-5 md:p-7 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--saffron)]">{kicker}</p>
              <p className="mt-1 font-arabic text-sm text-[var(--saffron)]/70">{kickerArabic}</p>
            </div>
            <ArrowUpRight
              size={18}
              className="text-[var(--cream-muted)] group-hover:text-[var(--saffron)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all"
            />
          </div>

          <div className="mt-auto">
            <h3 className={`font-display leading-[0.95] text-[var(--cream)] group-hover:text-[var(--saffron-glow)] transition-colors ${
              size === "lg" ? "text-[clamp(1.6rem,3vw,2.75rem)]" :
              size === "md" ? "text-[clamp(1.4rem,2.4vw,2rem)]" :
                              "text-[clamp(1.25rem,2vw,1.6rem)]"
            }`}>
              {title}
            </h3>
            <div className="mt-3 flex items-center gap-3 font-mono text-[10px] tracking-[0.22em] uppercase text-[var(--cream-muted)]">
              <span>{year ?? "—"}</span>
              <span className="h-px w-6 bg-[var(--taupe)]/40" />
              <span>view reel</span>
            </div>
            {overview && size !== "sm" && (
              <p className="mt-4 hidden md:block text-sm text-[var(--cream)]/70 line-clamp-2 max-w-md">
                {overview}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
