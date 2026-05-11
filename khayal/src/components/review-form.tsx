"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PenLine, LoaderCircle, Trash2 } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { cn } from "@/lib/utils";

export interface ReviewFormProps {
  userId: string | null;
  kind: "movie" | "tv_series";
  targetId: number;
  slug: string;
  /** Existing review by this user, if any. */
  existing: {
    id: number;
    headline: string | null;
    body: string;
    contains_spoiler: boolean;
  } | null;
}

/**
 * Write-your-own review form. Single review per user per title.
 * If the user already reviewed, lets them edit or delete.
 */
export function ReviewForm({ userId, kind, targetId, slug, existing }: ReviewFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(!!existing);
  const [headline, setHeadline] = useState(existing?.headline ?? "");
  const [body, setBody]         = useState(existing?.body ?? "");
  const [spoiler, setSpoiler]   = useState(existing?.contains_spoiler ?? false);
  const [err, setErr]           = useState<string | null>(null);
  const [pending, start]        = useTransition();

  if (!userId) {
    return (
      <div className="p-6 rounded-md bg-[var(--ink-lift)] border border-[var(--taupe)]/20 flex items-center justify-between gap-4">
        <p className="text-sm text-[var(--cream-muted)]">
          <span className="font-display italic text-[var(--cream)] text-base">Have thoughts?</span> Sign in to write your review.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(kind === "movie" ? `/movies/${slug}` : `/tv/${slug}`)}`}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-[var(--saffron)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--saffron-glow)] transition-colors whitespace-nowrap"
        >
          <PenLine size={13} /> Sign in to review
        </Link>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!body.trim()) { setErr("Review body is required."); return; }
    start(async () => {
      const sb = supabaseBrowser();
      const table = kind === "movie" ? "movie_reviews" : "tv_series_reviews";
      const idField = kind === "movie" ? "movie_id" : "tv_series_id";
      const row = {
        user_id: userId,
        [idField]: targetId,
        headline: headline.trim() || null,
        body: body.trim(),
        contains_spoiler: spoiler,
      };
      const { error } = await sb
        .from(table)
        .upsert(row, { onConflict: `user_id,${idField}` });
      if (error) { setErr(error.message); return; }
      router.refresh();
    });
  };

  const remove = () => {
    if (!existing) return;
    if (!confirm("Delete this review?")) return;
    start(async () => {
      const sb = supabaseBrowser();
      const table = kind === "movie" ? "movie_reviews" : "tv_series_reviews";
      const { error } = await sb.from(table).delete().eq("id", existing.id);
      if (error) { setErr(error.message); return; }
      setOpen(false); setHeadline(""); setBody(""); setSpoiler(false);
      router.refresh();
    });
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full p-6 rounded-md bg-[var(--ink-lift)] border border-dashed border-[var(--taupe)]/30 text-left hover:border-[var(--saffron)]/50 transition-colors group"
      >
        <p className="font-display italic text-lg text-[var(--cream)] group-hover:text-[var(--saffron-glow)] transition-colors">
          Write a review…
        </p>
        <p className="mt-1 text-xs text-[var(--cream-muted)]">
          Share what you thought. Mark as spoiler if it reveals plot beats.
        </p>
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="p-6 rounded-md bg-[var(--ink-lift)] border border-[var(--taupe)]/25 space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--saffron)]">
          {existing ? "Edit your review" : "Write your review"}
        </p>
        {existing && (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono tracking-wider uppercase text-[var(--cream-muted)] hover:text-[var(--danger)]"
          >
            <Trash2 size={11} /> Delete
          </button>
        )}
      </div>

      <input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder="Headline (optional)"
        maxLength={120}
        className="w-full h-11 px-3 rounded-md text-base bg-[var(--ink)] border border-[var(--taupe)]/25 text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus-visible:outline-none focus:border-[var(--saffron)]/60"
      />

      <textarea
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What did you think?"
        rows={5}
        className="w-full p-3 rounded-md text-sm bg-[var(--ink)] border border-[var(--taupe)]/25 text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus-visible:outline-none focus:border-[var(--saffron)]/60 resize-y"
      />

      <label className="flex items-center gap-2 text-xs text-[var(--cream-muted)] cursor-pointer">
        <input
          type="checkbox"
          checked={spoiler}
          onChange={(e) => setSpoiler(e.target.checked)}
          className="h-4 w-4 rounded-md accent-[var(--saffron)]"
        />
        Contains spoilers. Hide body behind a reveal.
      </label>

      {err && (
        <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md px-3 py-2">
          {err}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className={cn(
            "inline-flex items-center gap-2 h-11 px-5 rounded-md text-sm font-medium",
            "bg-[var(--saffron)] text-[var(--ink)]",
            "hover:bg-[var(--saffron-glow)]",
            "shadow-[0_0_16px_-6px_var(--saffron)]",
            "disabled:opacity-60"
          )}
        >
          {pending && <LoaderCircle size={13} className="animate-spin" />}
          {existing ? "Update review" : "Publish review"}
        </button>
        {!existing && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={pending}
            className="h-11 px-4 rounded-md text-xs tracking-wider uppercase font-mono text-[var(--cream-muted)] hover:text-[var(--cream)] border border-[var(--taupe)]/25 hover:border-[var(--taupe)]/50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
