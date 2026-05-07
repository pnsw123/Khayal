"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
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
  const ref = useRef<HTMLAnchorElement>(null);
  const [imgBroken, setImgBroken] = useState(false);
  const showPoster = posterUrl && !imgBroken;

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 300, damping: 42, mass: 0.42 });
  const sy = useSpring(my, { stiffness: 300, damping: 42, mass: 0.42 });
  const rotateX = useTransform(sy, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(sx, [-0.5, 0.5], ["-6deg", "6deg"]);

  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    mx.set((e.clientX - r.left - r.width / 2) / r.width);
    my.set((e.clientY - r.top - r.height / 2) / r.height);
  };

  const langLabel = language ? (LANG_LABELS[language] ?? language.toUpperCase().slice(0, 3)) : null;
  const visibleGenres = (genres ?? []).slice(0, 2);

  return (
    <Link
      href={href}
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
      className={cn("group block focus:outline-none", className)}
    >
      {/* ── Poster ── */}
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className={cn(
          "relative aspect-[2/3] w-full rounded-md overflow-hidden border transition-colors duration-300 shadow-[0_8px_30px_-14px_rgb(0_0_0/0.9)]",
          showPoster
            ? "bg-[var(--ink-lift)] border-[var(--ink-high)] group-hover:border-[var(--saffron)]/60"
            : "border-[var(--saffron)]/20 bg-[linear-gradient(145deg,var(--ink-lift)_0%,var(--ink-high)_100%)] group-hover:border-[var(--saffron)]/50"
        )}
      >
        {showPoster ? (
          <img
            src={posterUrl!}
            alt={title}
            loading="lazy"
            onError={() => setImgBroken(true)}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 gap-3">
            <span className="font-arabic text-[var(--saffron)]/50 text-2xl">خيال</span>
            <h4 className="font-display italic text-[var(--cream)]/80 text-sm leading-tight line-clamp-4 text-center">
              {title}
            </h4>
          </div>
        )}

        {/* Top-left: rating pill */}
        {typeof rating === "number" && rating > 0 && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 h-6 rounded-sm bg-[var(--ink)]/85 backdrop-blur-sm border border-[var(--saffron)]/25 text-xs">
            <Star size={10} className="fill-[var(--saffron)] text-[var(--saffron)]" />
            <span className="font-mono tracking-tight text-[var(--cream)]">{rating.toFixed(1)}</span>
          </div>
        )}

        {/* Top-right: age rating badge */}
        {ageRating && (
          <div className="absolute top-2 right-2 px-1.5 h-5 flex items-center rounded-sm bg-[var(--ink)]/80 backdrop-blur-sm border border-[var(--taupe)]/30 font-mono text-[9px] tracking-wider text-[var(--cream-muted)] uppercase">
            {ageRating}
          </div>
        )}

        {/* Bottom overlay on hover: runtime + language */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-2 px-2 pb-2 pt-6 bg-gradient-to-t from-[var(--ink)]/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-250">
          {runtime && (
            <span className="flex items-center gap-1 font-mono text-[10px] text-[var(--cream-muted)]">
              <Clock size={9} />
              {runtime}m
            </span>
          )}
          {langLabel && language !== "en" && (
            <span className="ml-auto font-mono text-[9px] tracking-widest uppercase text-[var(--saffron)]/70 border border-[var(--saffron)]/25 px-1 rounded-sm">
              {langLabel}
            </span>
          )}
        </div>

        {/* Subtle bottom accent on hover */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] bg-[var(--saffron)]/70 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      </motion.div>

      {/* ── Below poster ── */}
      <div className="pt-2.5 space-y-1">
        {/* Title */}
        <h3 className="font-sans text-[0.85rem] font-medium leading-snug text-[var(--cream)] line-clamp-2 group-hover:text-[var(--saffron-glow)] transition-colors">
          {title}
        </h3>
        {/* Year + genres */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {year && (
            <span className="font-mono text-[10px] text-[var(--cream-muted)]">{year}</span>
          )}
          {visibleGenres.slice(0, 1).map((g) => (
            <span
              key={g}
              className="font-mono text-[9px] text-[var(--cream-muted)]/60"
            >
              · {g}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
