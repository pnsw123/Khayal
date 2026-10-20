"use client";

import Link from "next/link";
import { useState } from "react";
import { Star, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const LANG_LABELS: Record<string, string> = {
  en: "EN", fr: "FR", ja: "JA", ko: "KO", zh: "ZH",
  es: "ES", de: "DE", it: "IT", pt: "PT", ru: "RU",
  ar: "AR", hi: "HI", tr: "TR", nl: "NL", sv: "SV",
};

export interface MovieCardProps {
  title: string;
  year: string | null;
  posterUrl: string | null;
  rating?: number | null;
  href: string;
  className?: string;
  // metadata tags
  genres?: string[] | null;
  language?: string | null;
  runtime?: number | null;
  ageRating?: string | null;
}

export function MovieCard({
  title, year, posterUrl, rating, href, className,
  genres, language, runtime, ageRating,
}: MovieCardProps) {
  const [imgBroken, setImgBroken] = useState(false);
  const showPoster = posterUrl && !imgBroken;

  const langLabel = language ? (LANG_LABELS[language] ?? language.toUpperCase().slice(0, 3)) : null;
  const visibleGenres = (genres ?? []).slice(0, 2);

  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-2xl transition-transform duration-150 ease-out active:scale-[0.97]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
        className,
      )}
    >
      {/* ── Poster ── */}
      <div
        className={cn(
          "relative aspect-[2/3] w-full rounded-2xl overflow-hidden shadow-[0_4px_6px_-1px_rgb(0_0_0/0.1),0_2px_4px_-2px_rgb(0_0_0/0.1)]",
          showPoster
            ? "bg-[var(--ink-high)]"
            : "bg-[linear-gradient(145deg,var(--ink-lift)_0%,var(--ink-high)_100%)] ring-1 ring-inset ring-[var(--glass-line)]"
        )}
      >
        {showPoster ? (
          <img
            src={posterUrl!}
            alt={title}
            loading="lazy"
            onError={() => setImgBroken(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3">
            <span className="font-arabic text-[var(--saffron-glow)]/60 text-2xl">خيال</span>
            <h4 className="font-display text-[var(--cream)]/80 text-sm leading-tight line-clamp-4 text-center">
              {title}
            </h4>
          </div>
        )}

        {/* Top-left: rating pill */}
        {typeof rating === "number" && rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 h-6 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-xs">
            <Star size={10} className="fill-amber-300 text-amber-300" />
            <span className="tabular-nums text-white">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Top-right: age rating badge */}
        {ageRating && (
          <div className="absolute top-2 right-2 px-2 h-6 flex items-center rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[10px] font-medium tracking-wide text-white/85 uppercase">
            {ageRating}
          </div>
        )}

        {/* Bottom overlay on hover: runtime + language */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 px-3 pb-2.5 pt-8 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          {runtime && (
            <span className="flex items-center gap-1 text-[11px] text-white/80">
              <Clock size={9} />
              {runtime}m
            </span>
          )}
          {langLabel && language !== "en" && (
            <span className="ml-auto text-[10px] font-medium tracking-wide uppercase text-[var(--saffron-glow)] border border-[var(--saffron)]/40 px-1.5 rounded-full">
              {langLabel}
            </span>
          )}
        </div>

      </div>

      {/* ── Below poster ── */}
      <div className="pt-2.5 px-0.5 space-y-0.5">
        {/* Title */}
        <h3 className="text-sm font-medium leading-snug text-[var(--cream)] line-clamp-1 group-hover:text-white transition-colors duration-150">
          {title}
        </h3>
        {/* Year + genres */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {year && (
            <span className="text-xs text-[var(--cream-muted)]">{year}</span>
          )}
          {visibleGenres.slice(0, 1).map((g) => (
            <span
              key={g}
              className="text-xs text-[var(--cream-muted)]/70"
            >
              · {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
