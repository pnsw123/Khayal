"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MovieCard } from "@/components/movie-card";
import { cn } from "@/lib/utils";
import { searchAll } from "@/lib/search";
import { buildFilterHref, YEARS } from "@/lib/filters";
import { Search, Play, LoaderCircle, Table2 } from "lucide-react";

type Tab = "find" | "sql";
type SavedQuery = { id: number; title: string; query_text: string };

const MEDIA_TYPES = [
  { code: "", label: "All" },
  { code: "movie", label: "Films" },
  { code: "tv", label: "TV" },
] as const;

export function SearchClient({ defaultQueries }: { defaultQueries: SavedQuery[] }) {
  const [tab, setTab] = useState<Tab>("find");
  return (
    <div>
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
        active ? "text-[var(--cream)]" : "text-[var(--cream-muted)] hover:text-[var(--cream)]"
      )}
    >
      {icon} {label}
      {active && <span className="absolute left-3 right-3 -bottom-[1px] h-[2px] bg-[var(--accent)]" />}
    </button>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
  testId,
}: {
  options: readonly { code: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  testId: string;
}) {
  return (
    <div className="flex flex-wrap gap-2" data-testid={testId}>
      {options.map((opt) => (
        <button
          key={opt.code}
          onClick={() => onChange(opt.code)}
          className={cn(
            "h-7 px-3 rounded-full text-xs transition-colors border",
            value === opt.code
              ? "bg-[var(--accent)] text-[var(--ink)] border-[var(--accent)]"
              : "bg-transparent text-[var(--cream-muted)] border-[var(--taupe)]/30 hover:text-[var(--cream)] hover:border-[var(--taupe)]/60"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function FindTab() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialQ = searchParams.get("q") ?? "";
  const initialType = (searchParams.get("type") ?? "") as "" | "movie" | "tv";
  const initialYear = searchParams.get("year") ?? "";
  const initialGenre = searchParams.get("genre") ?? "";

  const [q, setQ] = useState(initialQ);
  const [typeFilter, setTypeFilter] = useState<"" | "movie" | "tv">(initialType);
  const [yearFilter, setYearFilter] = useState(initialYear);
  const [rows, setRows] = useState<Awaited<ReturnType<typeof searchAll>>>([]);
  const [pending, startTransition] = useTransition();
  const [fetching, setFetching] = useState(false);
  const reqIdRef = useRef(0);

  const syncUrl = (newQ: string, newType: string, newYear: string, newGenre: string) => {
    const sp = new URLSearchParams();
    if (newQ) sp.set("q", newQ);
    if (newType) sp.set("type", newType);
    if (newYear) sp.set("year", newYear);
    if (newGenre) sp.set("genre", newGenre);
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `/search?${qs}` : "/search", { scroll: false }));
  };

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setRows([]);
      setFetching(false);
      return;
    }
    setFetching(true);
    const handle = setTimeout(async () => {
      const myId = ++reqIdRef.current;
      const results = await searchAll(text, {
        type: typeFilter || undefined,
        year: yearFilter || undefined,
        genre: initialGenre || undefined,
      });
      if (myId !== reqIdRef.current) return;
      setRows(results);
      setFetching(false);
    }, 200);
    return () => clearTimeout(handle);
  }, [q, typeFilter, yearFilter, initialGenre]);

  const handleQChange = (val: string) => {
    setQ(val);
    syncUrl(val, typeFilter, yearFilter, initialGenre);
  };

  const handleTypeChange = (val: "" | "movie" | "tv") => {
    setTypeFilter(val);
    syncUrl(q, val, yearFilter, initialGenre);
  };

  const handleYearChange = (val: string) => {
    setYearFilter(val);
    syncUrl(q, typeFilter, val, initialGenre);
  };

  const touched = q.trim().length >= 2;
  const isLoading = fetching || pending;

  return (
    <div>
      <form onSubmit={(e) => e.preventDefault()} className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--cream-muted)]" />
        <input
          autoFocus
          data-testid="search-input"
          value={q}
          onChange={(e) => handleQChange(e.target.value)}
          placeholder="Title, phrase, idea…"
          className="w-full h-11 pl-11 pr-11 rounded-md text-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/25 text-[var(--cream)] placeholder:text-[var(--cream-muted)]/60 focus:outline-none focus:border-[var(--accent-dim)] transition-colors"
        />
        {isLoading && (
          <LoaderCircle
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-[var(--cream-muted)]"
          />
        )}
      </form>

      <div className="flex flex-wrap gap-4 mb-8">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--cream-muted)] mb-2">Type</p>
          <ChipRow options={MEDIA_TYPES} value={typeFilter} onChange={handleTypeChange} testId="filter-type" />
        </div>
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--cream-muted)] mb-2">Decade</p>
          <ChipRow
            options={YEARS}
            value={yearFilter}
            onChange={handleYearChange}
            testId="filter-year"
          />
        </div>
      </div>

      {!touched && (
        <p className="text-sm text-[var(--cream-muted)]">
          Full-text search across 7,400+ films and 2,800+ TV series. Matches across titles and overviews,
          ranked by relevance. Just start typing.
        </p>
      )}

      {touched && rows.length === 0 && !isLoading && (
        <div className="py-16 text-center">
          <p className="font-arabic text-3xl text-[var(--cream-muted)]/50 mb-3">لا خيال هنا</p>
          <p className="font-display italic text-xl text-[var(--cream)]">No such fantasy.</p>
          <p className="mt-2 text-sm text-[var(--cream-muted)]">Try a different title or phrase.</p>
        </div>
      )}

      {rows.length > 0 && (
        <div
          data-testid="search-results"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-x-5 gap-y-8"
        >
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

function SqlTab({ defaultQueries }: { defaultQueries: SavedQuery[] }) {
  const [sql, setSql] = useState(defaultQueries[0]?.query_text || "select title, release_date from movies order by release_date desc limit 10");
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [err, setErr] = useState<string | null>(null);
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
      setErr((e as { message?: string })?.message || "Query failed.");
      setRows([]);
      return;
    }
    const data = await res.json();
    setRows(Array.isArray(data) ? data : []);
  };

  const cols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-6">
      <aside>
        <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)] mb-3">
          Default queries
        </p>
        <ul className="space-y-1">
          {defaultQueries.map((dq) => (
            <li key={dq.id}>
              <button
                onClick={() => setSql(dq.query_text)}
                className="text-left w-full px-3 py-2 text-sm rounded-md border border-transparent text-[var(--cream-muted)] hover:text-[var(--cream)] hover:bg-[var(--ink-lift)] hover:border-[var(--taupe)]/25 transition-colors"
              >
                {dq.title}
              </button>
            </li>
          ))}
          {defaultQueries.length === 0 && (
            <li className="text-xs text-[var(--cream-muted)] px-3 py-2">None seeded.</li>
          )}
        </ul>
      </aside>

      <div>
        <div className="relative mb-3">
          <textarea
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            spellCheck={false}
            className="w-full h-44 p-4 rounded-md font-mono text-sm bg-[var(--ink-lift)] border border-[var(--taupe)]/25 text-[var(--cream)] focus:outline-none focus:border-[var(--accent-dim)] transition-colors resize-y"
          />
          <button
            onClick={run}
            className="absolute bottom-3 right-3 h-9 px-4 rounded-md bg-[var(--accent)] text-[var(--ink)] text-sm font-medium hover:bg-[var(--cream)] inline-flex items-center gap-2"
          >
            {pending ? <LoaderCircle size={13} className="animate-spin" /> : <Play size={13} />} Run
          </button>
        </div>

        <p className="text-[11px] font-mono text-[var(--cream-muted)] mb-4">
          Read-only SQL. Only SELECT statements are accepted.
        </p>

        {err && (
          <div className="text-sm text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/30 rounded-md px-3 py-2 mb-4">
            {err}
          </div>
        )}

        {rows.length > 0 && (
          <div className="border border-[var(--taupe)]/15 rounded-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--ink-lift)]">
                  <tr>
                    {cols.map((c) => (
                      <th key={c} className="text-left px-4 py-3 font-mono text-[10px] tracking-[0.15em] uppercase text-[var(--accent-dim)] border-b border-[var(--taupe)]/15">
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

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
