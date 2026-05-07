"use client";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function DeleteContentButton({ id, type, title }: {
  id: number; type: "movies" | "tv"; title: string;
}) {
  const [deleted, setDeleted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function del() {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setLoading(true);
    const table = type === "movies" ? "movies" : "tv_series";
    await sb.from(table).delete().eq("id", id);
    setDeleted(true);
    setLoading(false);
  }

  if (deleted) return <span className="text-xs text-zinc-500">Deleted</span>;

  return (
    <button
      onClick={del}
      disabled={loading}
      className="p-1.5 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors disabled:opacity-50"
      title="Delete"
    >
      <Trash2 size={13} />
    </button>
  );
}
