"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, LoaderCircle } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export interface RateWidgetProps {
  /** Current logged-in user's id. Null = show sign-in prompt. */
  userId: string | null;
  /** Whether this is a movie or tv_series (drives table name). */
  kind: "movie" | "tv_series";
  /** Row id (movies.id or tv_series.id). */
  targetId: number;
  /** The user's current rating (1..10), if they've already rated. */
  initialRating: number | null;
  /** Slug for return-path on sign-in. */
  slug: string;
}

/**
 * Returns tier-appropriate unlit hover classes for a rating button.
 * 1–4 = red tint, 5–7 = neutral saffron, 8–10 = green tint.
 */
export function getUnlitHoverClasses(n: number): string {
  if (n <= 4) {
    return "bg-[var(--ink-lift)] text-[var(--cream-muted)] border border-[var(--taupe)]/20 hover:border-red-500/50 hover:text-red-400";
  }
  if (n <= 7) {
    return "bg-[var(--ink-lift)] text-[var(--cream-muted)] border border-[var(--taupe)]/20 hover:border-[var(--saffron)]/50 hover:text-[var(--cream)]";
  }
  return "bg-[var(--ink-lift)] text-[var(--cream-muted)] border border-[var(--taupe)]/20 hover:border-green-500/50 hover:text-green-400";
}

/**
 * Rate-a-title widget — 10 numbered buttons. Upserts on click.
 * Server-side RLS + our unique (user_id, movie_id) index enforces one rating
 * per user per title. The hover state shows what the rating WOULD be.
 */
export function RateWidget({ userId, kind, targetId, initialRating, slug }: RateWidgetProps) {
  const router = useRouter();
  const [rating, setRating] = useState<number | null>(initialRating);
  const [hover,  setHover]  = useState<number | null>(null);
  const [err,    setErr]    = useState<string | null>(null);
  const [pending, start] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => clearTimeout(debounceRef.current);
  }, []);

  if (!userId) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(kind === "movie" ? `/movies/${slug}` : `/tv/${slug}`)}`}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-md bg-[var(--saffron)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--saffron-glow)] transition-colors"
      >
        <Star size={14} /> Sign in to rate
      </Link>
    );
  }

  const save = (n: number) => {
    setErr(null);
    setRating(n); // optimistic — instant feedback, outside debounce
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      start(async () => {
        const sb = supabaseBrowser();
        const upsertQuery = kind === "movie"
          ? sb.from("movie_ratings").upsert({ user_id: userId, movie_id: targetId, rating: n }, { onConflict: "user_id,movie_id" })
          : sb.from("tv_series_ratings").upsert({ user_id: userId, tv_series_id: targetId, rating: n }, { onConflict: "user_id,tv_series_id" });
        const { error } = await upsertQuery;
        if (error) { setErr(error.message); setRating(initialRating); return; }
        router.refresh();
      });
    }, 300);
  };

  const clear = () => {
    if (rating == null) return;
    setErr(null);
    const prev = rating;
    setRating(null);
    start(async () => {
      const sb = supabaseBrowser();
      const deleteQuery = kind === "movie"
        ? sb.from("movie_ratings").delete().eq("user_id", userId).eq("movie_id", targetId)
        : sb.from("tv_series_ratings").delete().eq("user_id", userId).eq("tv_series_id", targetId);
      const { error } = await deleteQuery;
      if (error) { setErr(error.message); setRating(prev); return; }
      router.refresh();
    });
  };

  const display = hover ?? rating;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span
          data-testid="current-rating-display"
          className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--cream-muted)] mr-3"
        >
          Your rating
        </span>
        {[1,2,3,4,5,6,7,8,9,10].map((n) => {
          const lit = display != null && n <= display;
          return (
            <button
              key={n}
              onClick={() => save(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(null)}
              disabled={pending}
              aria-label={`Rate ${n} out of 10`}
              data-testid={`rate-button-${n}`}
              className={cn(
                "h-9 w-9 rounded-md text-sm font-mono transition-all",
                lit
                  ? "bg-[var(--saffron)] text-[var(--ink)]"
                  : getUnlitHoverClasses(n)
              )}
            >
              {n}
            </button>
          );
        })}
        {rating != null && (
          <button
            onClick={clear}
            disabled={pending}
            data-testid="clear-rating-button"
            className="ml-3 text-[10px] font-mono tracking-wider uppercase text-[var(--cream-muted)] hover:text-[var(--danger)]"
          >
            Clear
          </button>
        )}
        {pending && <LoaderCircle size={14} className="animate-spin text-[var(--cream-muted)] ml-2" />}
      </div>
      {err && <p className="text-[11px] text-[var(--danger)]">{err}</p>}
    </div>
  );
}
