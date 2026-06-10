"use client";
import { useState } from "react";
import { promoteUser } from "./actions";

export function PromoteButton({ userId }: { userId: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function promote() {
    setLoading(true);
    setError(null);
    const result = await promoteUser(userId);
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  }

  if (done) return <span className="text-xs text-amber-400">Promoted</span>;

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {error && (
        <span className="text-xs text-red-400" data-testid="promote-error">
          {error}
        </span>
      )}
      <button
        onClick={promote}
        disabled={loading}
        data-testid="promote-button"
        className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 transition-colors disabled:opacity-50"
      >
        {loading ? "..." : "Make Admin"}
      </button>
    </span>
  );
}
