"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteContent } from "./actions";

export function DeleteContentButton({ id, type, title }: {
  id: number; type: "movies" | "tv"; title: string;
}) {
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function del() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setLoading(true);
    setError(null);
    const result = await deleteContent(id, type);
    if (!result.success) {
      setError(result.error);
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
        <span className="text-xs text-red-400" data-testid="delete-content-error">
          {error}
        </span>
      )}
      <button
        onClick={del}
        disabled={loading}
        data-testid="delete-content-button"
        className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
        title="Delete"
      >
        <Trash2 size={13} />
      </button>
    </span>
  );
}
