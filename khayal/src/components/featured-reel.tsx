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
        className={`group relative block overflow-hidden rounded-2xl border border-[var(--glass-line)] hover:border-[var(--saffron)]/50 transition-colors duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${aspect}`}
      >
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-50 group-hover:opacity-65 group-hover:scale-[1.04] transition-all duration-500 ease-out"
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
        
        <div className="relative h-full p-5 md:p-7 flex flex-col">
          <div className="flex items-start justify-between">
            <div>
              <span className="inline-flex items-center h-7 px-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-xs font-medium tracking-wide text-white">{kicker}</span>
              <p className="mt-2 font-arabic text-sm text-[var(--saffron-glow)]/80">{kickerArabic}</p>
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
            <div className="mt-3 flex items-center gap-3 text-xs text-white/60">
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
