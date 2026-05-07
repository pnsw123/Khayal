"use client";

import { useEffect, useRef, useState } from "react";
import { MovieCard } from "@/components/movie-card";
import { cn } from "@/lib/utils";
import { Search, Play, LoaderCircle, Table2 } from "lucide-react";

type Tab = "find" | "sql";
type SavedQuery = { id: number; title: string; query_text: string };

interface SearchAllRow {
  id: number; type: "movie" | "tv"; title: string; slug: string;
  overview: string | null; poster_url: string | null; release_year: number | null; relevance: number;
  age_rating: string | null; original_language: string | null;
  runtime_minutes: number | null; genre_names: string[] | null;
}

export function SearchClient({ defaultQueries }: { defaultQueries: SavedQuery[] }) {
  const [tab, setTab] = useState<Tab>("find");
  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-[var(--taupe)]/15 mb-8">
        <TabBtn active={tab === "find"} onClick={() => setTab("find")} icon={<Search size={14} />} label="Find" />
        <TabBtn active={tab === "sql"}  onClick={() => setTab("sql")}  icon={<Table2 size={14} />} label="SQL" />
      </div>

      {tab === "find" ? <FindTab /> : <SqlTab defaultQueries={defaultQueries} />}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative inline-flex items-center gap-2 px-5 py-3 text-sm tracking-wide transition-colors",
        active ? "text-[var(--saffron)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
      )}
    >
      {icon} {label}
      {active && <span className="absolute left-3 right-3 -bottom-[1px] h-[2px] bg-[var(--saffron)]" />}
    </button>
  );
}

// ─── Normal full-text search tab ──────────────────────────────────────────

function FindTab() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<SearchAllRow[]>([]);
  const [pending, setPending] = useState(false);
  const reqIdRef = useRef(0);

  // Live search: 200ms debounce on `q`. Min 2 chars. Stale-response guard via reqId.
  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setRows([]);
      setPending(false);
      return;
    }
    setPending(true);
    const handle = setTimeout(async () => {
      const myId = ++reqIdRef.current;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/search_all`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          },
          body: JSON.stringify({ query_text: text, page_size: 30 }),
        }
      );
      const data = res.ok ? await res.json() : [];
      if (myId !== reqIdRef.current) return;
      setRows((data ?? []) as SearchAllRow[]);
      setPending(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [q]);

  const touched = q.trim().length >= 2;

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} className="relative mb-10">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cream-muted)]" />
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title, phrase, idea…"
          className="w-full h-14 pl-12 pr-12 rounded-sm text-base bg-[var(--ink-lift)] border border-[var(--taupe)]/25 text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:outline-none focus:border-[var(--saffron)]/60"
        />
        {pending && (
          <LoaderCircle
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--saffron)]"
          />
        )}
      </form>

      {!touched && (
        <p className="text-sm text-[var(--cream-muted)]">
          Full-text search across 7,400+ films and 2,800+ TV series. Matches across titles and overviews,
          ranked by relevance. Just start typing.
        </p>
      )}

      {touched && rows.length === 0 && !pending && (
        <div className="py-16 text-center">
          <p className="font-arabic text-3xl text-[var(--saffron)]/70 mb-3">لا خيال هنا</p>
          <p className="font-display italic text-xl text-[var(--cream)]">No such fantasy.</p>
          <p className="mt-2 text-sm text-[var(--cream-muted)]">Try a different title or phrase.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8">
          {rows.map((r) => (
            <MovieCard
              key={`${r.type}-${r.id}`}
              title={r.title}
              year={r.release_year ? String(r.release_year) : null}
              posterUrl={r.poster_url}
              href={r.type === "movie" ? `/movies/${r.slug}` : `/tv/${r.slug}`}
              genres={r.genre_names ?? []}
              language={r.original_language}
              runtime={r.runtime_minutes}
              ageRating={r.age_rating}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SQL explorer tab ─────────────────────────────────────────────────────

function SqlTab({ defaultQueries }: { defaultQueries: SavedQuery[] }) {
  const [sql, setSql] = useState(defaultQueries[0]?.query_text || "select title, release_date from movies order by release_date desc limit 10");
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr]   = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const run = async () => {
    setErr(null);
    setPending(true);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/run_query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ query_text: sql }),
      }
    );
    setPending(false);
    if (!res.ok) {
      const e = await res.json().catch(() => ({}));
      setErr(e?.message || "Query failed.");
      setRows([]);
      return;
    }
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  };

  const cols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      {/* Sidebar: default queries */}
      <aside>
        <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)] mb-3">
          Default queries
        </p>
        <ul className="space-y-1">
          {defaultQueries.map((q) => (
            <li key={q.id}>
              <button
                onClick={() => setSql(q.query_text)}
                className="text-left w-full px-3 py-2 text-sm rounded-sm border border-transparent text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--ink-lift)] hover:border-[var(--taupe)]/25 transition-colors"
              >
                {q.title}
              </button>
            </li>
          ))}
          {defaultQueries.length === 0 && (
            <li className="text-xs text-[var(--cream-muted)] px-3 py-2">None seeded.</li>
          )}
        </ul>
      </aside>

      {/* Editor + results */}
      <div>
        <div className="relative mb-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            className="w-full h-44 p-4 rounded-sm font-mono text-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/25 text-[var(--cream)] focus:outline-none focus:border-[var(--saffron)]/60 resize-y"
          />
          <button
            onClick={run}
            className="absolute bottom-3 right-3 h-9 px-4 rounded-sm bg-[var(--saffron)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--saffron-glow)] inline-flex items-center gap-2"
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Play size={13} />} Run
          </button>
        </div>

        <p className="text-[11px] font-mono text-[var(--cream-muted)] mb-4">
          Read-only SQL. Only SELECT statements are accepted.
        </p>

        {err && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-sm px-3 py-2 mb-4">
            {err}
          </div>
        )}

        {rows.length > 0 && (
          <div className="border border-[var(--taupe)]/15 rounded-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--ink-lift)]">
                  <tr>
                    {cols.map((c) => (
                      <th key={c} className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--saffron)] border-b border-[var(--taupe)]/15">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--taupe)]/10 last:border-b-0 hover:bg-[var(--ink-lift)]/50">
                      {cols.map((c) => (
                        <td key={c} className="px-4 py-3 text-[var(--cream)] font-mono text-xs align-top">
                          {formatCell(row[c])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-4 py-2 font-mono text-[10px] tracking-wider uppercase text-[var(--cream-muted)] bg-[var(--ink-lift)]/50 border-t border-[var(--taupe)]/15">
              {rows.length} row{rows.length === 1 ? "" : "s"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function formatCell(v: any): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
