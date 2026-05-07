"use client";

import { useState, useTransition } from "react";
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

  if (!userId) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(kind === "movie" ? `/movies/${slug}` : `/tv/${slug}`)}`}
        className="inline-flex items-center gap-2 h-11 px-5 rounded-sm bg-[var(--saffron)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--saffron-glow)] transition-colors"
      >
        <Star size={14} /> Sign in to rate
      </Link>
    );
  }

  const save = (n: number) => {
    setErr(null);
    setRating(n); // optimistic
    start(async () => {
      const sb = supabaseBrowser();
      const table = kind === "movie" ? "movie_ratings" : "tv_series_ratings";
      const idField = kind === "movie" ? "movie_id" : "tv_series_id";
      const { error } = await sb
        .from(table)
        .upsert({ user_id: userId, [idField]: targetId, rating: n }, { onConflict: `user_id,${idField}` });
      if (error) { setErr(error.message); setRating(initialRating); return; }
      router.refresh();
    });
  };

  const clear = () => {
    if (rating == null) return;
    setErr(null);
    const prev = rating;
    setRating(null);
    start(async () => {
      const sb = supabaseBrowser();
      const table = kind === "movie" ? "movie_ratings" : "tv_series_ratings";
      const idField = kind === "movie" ? "movie_id" : "tv_series_id";
      const { error } = await sb
        .from(table)
        .delete()
        .eq("user_id", userId)
        .eq(idField, targetId);
      if (error) { setErr(error.message); setRating(prev); return; }
      router.refresh();
    });
  };

  const display = hover ?? rating;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--cream-muted)] mr-3">
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
              className={cn(
                "h-9 w-9 rounded-sm text-sm font-mono transition-all",
                lit
                  ? "bg-[var(--saffron)] text-[var(--ink)]"
                  : "bg-[var(--ink-lift)] text-[var(--cream-muted)] border border-[var(--taupe)]/20 hover:border-[var(--saffron)]/50 hover:text-[var(--cream)]"
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
