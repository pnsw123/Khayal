"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, LoaderCircle, Film, Tv } from "lucide-react";

interface Result {
  id: number;
  type: "movie" | "tv";
  title: string;
  slug: string;
  poster_url: string | null;
  release_year: number | null;
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function NavSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const reqId = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch results whenever q changes
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults([]);
      setPending(false);
      setOpen(false);
      return;
    }
    setPending(true);
    const timer = setTimeout(async () => {
      const id = ++reqId.current;
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/search_all`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: SUPABASE_KEY },
          body: JSON.stringify({ query_text: text, page_size: 8 }),
        });
        const data = res.ok ? await res.json() : [];
        if (id !== reqId.current) return;
        setResults(Array.isArray(data) ? data : []);
        setOpen(true);
      } catch {
        if (id === reqId.current) setResults([]);
      } finally {
        if (id === reqId.current) setPending(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goFull = (query = q) => {
    const t = query.trim();
    if (!t) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-xl">
      <div className="relative flex items-center">
        <Search size={13} className="absolute left-3 text-[var(--cream-muted)] pointer-events-none z-10" />
        <input
          type="text"
          data-testid="nav-search-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter") goFull(); if (e.key === "Escape") setOpen(false); }}
          autoComplete="off"
          spellCheck={false}
          className="w-full h-8 pl-9 pr-8 rounded-md bg-[var(--ink-lift)] border border-[var(--ink-high)] text-sm text-[var(--cream)] focus-visible:outline-none focus:border-[var(--taupe)]/50 transition-colors"
        />
        {pending && (
          <LoaderCircle size={12} className="absolute right-3 animate-spin text-[var(--cream-muted)]" />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] rounded-md bg-[var(--ink-lift)] border border-[var(--taupe)]/20 shadow-[0_16px_48px_-8px_rgb(0_0_0/0.8)] overflow-hidden">
          {results.length === 0 ? (
            <p className="px-4 py-3 text-sm text-[var(--cream-muted)]">No results for &ldquo;{q}&rdquo;</p>
          ) : (
            <>
              {results.map((r) => (
                <Link
                  key={`${r.type}-${r.id}`}
                  href={r.type === "movie" ? `/movies/${r.slug}` : `/tv/${r.slug}`}
                  onClick={() => { setOpen(false); setQ(""); }}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--ink-high)] transition-colors"
                >
                  <div className="w-8 h-12 shrink-0 rounded overflow-hidden bg-[var(--ink-high)]">
                    {r.poster_url ? (
                      <img src={r.poster_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--cream-muted)]/50">
                        {r.type === "movie" ? <Film size={12} /> : <Tv size={12} />}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] text-[var(--cream)] truncate leading-tight">{r.title}</p>
                    <p className="text-[11px] text-[var(--cream-muted)] mt-0.5">
                      {r.release_year ?? "—"} · {r.type === "tv" ? "TV" : "Film"}
                    </p>
                  </div>
                </Link>
              ))}
              <button
                onMouseDown={() => goFull()}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-t border-[var(--ink-high)] text-[11px] font-mono text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--ink-high)] transition-colors"
              >
                <Search size={10} /> See all results for &ldquo;{q}&rdquo;
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
