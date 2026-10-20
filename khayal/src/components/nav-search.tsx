"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Search, LoaderCircle, Film, Tv } from "lucide-react";
import { supabaseBrowser } from "@/lib/supabase-browser";

interface Result {
  id: number;
  type: "movie" | "tv";
  title: string;
  slug: string;
  poster_url: string | null;
  release_year: number | null;
}

export function NavSearch() {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const reqId = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Fetch results whenever q changes
  useEffect(() => {
    if (pathname === "/login") return;
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
        const { data, error } = await supabaseBrowser().rpc("search_all", {
          query_text: text,
          page_size: 8,
        });
        if (id !== reqId.current) return;
        setResults(!error && Array.isArray(data) ? (data as Result[]) : []);
        setOpen(true);
      } catch {
        if (id === reqId.current) setResults([]);
      } finally {
        if (id === reqId.current) setPending(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [q, pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (pathname === "/login") return null;

  const goFull = (query = q) => {
    const t = query.trim();
    if (!t) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(t)}`);
  };

  return (
    <div ref={wrapRef} className="relative w-full min-w-0">
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
          placeholder="Search titles…"
          aria-label="Search films and series"
          className="w-full h-9 pl-9 pr-8 rounded-full bg-[var(--glass)] border border-[var(--glass-line)] text-sm text-[var(--cream)] placeholder:text-[var(--cream-muted)]/70 focus-visible:outline-none focus:border-[var(--saffron)]/60 focus:bg-[var(--glass-strong)] transition-colors duration-150"
        />
        {pending && (
          <LoaderCircle size={12} className="absolute right-3 animate-spin text-[var(--cream-muted)]" />
        )}
      </div>

      {open && (
        <div className="absolute top-full left-0 w-[min(22rem,calc(100vw-2rem))] mt-3 z-[100] rounded-2xl bg-[var(--ink-lift)]/95 backdrop-blur-xl border border-[var(--glass-line)] shadow-[0_16px_48px_-8px_rgb(0_0_0/0.8)] overflow-hidden">
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
                  <div className="w-8 h-12 shrink-0 rounded-md overflow-hidden bg-[var(--ink-high)]">
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
