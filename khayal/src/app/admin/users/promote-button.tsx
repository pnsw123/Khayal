"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export function PromoteButton({ userId }: { userId: string }) {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function promote() {
    setLoading(true);
    await sb.from("profiles").update({ role: "admin" }).eq("id", userId);
    setDone(true);
    setLoading(false);
  }

  if (done) return <span className="text-xs text-amber-400">Promoted</span>;

  return (
    <button
      onClick={promote}
      disabled={loading}
      className="text-xs px-2 py-1 rounded bg-amber-600/20 text-amber-400 hover:bg-amber-600/40 transition-colors disabled:opacity-50"
    >
      {loading ? "..." : "Make Admin"}
    </button>
  );
}
