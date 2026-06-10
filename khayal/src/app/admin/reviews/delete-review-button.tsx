"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function DeleteReviewButton({ reviewId, type }: { reviewId: number; type: "movie" | "tv" }) {
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    if (!confirm("Delete this review?")) return;
    setLoading(true);
    setError(null);
    const table = type === "movie" ? "movie_reviews" : "tv_series_reviews";
    const { error: err } = await sb.from(table).delete().eq("id", reviewId);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    setDeleted(true);
    setLoading(false);
  }

  if (deleted) return <span className="text-xs text-zinc-500">Deleted</span>;

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {error && (
        <span className="text-xs text-red-400" data-testid="delete-review-error">
          {error}
        </span>
      )}
      <button
        onClick={del}
        disabled={loading}
        data-testid="delete-review-button"
        className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50 shrink-0"
        title="Delete review"
      >
        <Trash2 size={14} />
      </button>
    </span>
  );
}
