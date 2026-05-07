"use client";

import { useState } from "react";
import { ChevronDown, Tv } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Season {
  id: number;
  season_number: number;
  name: string | null;
  overview: string | null;
  air_date: string | null;
  episode_count: number | null;
  poster_url: string | null;
}

export function SeasonsAccordion({ seasons }: { seasons: Season[] }) {
  const [open, setOpen] = useState<number | null>(null);

  if (!seasons.length) return null;

  // Put specials (season 0) last
  const sorted = [...seasons].sort((a, b) =>
    a.season_number === 0 ? 1 : b.season_number === 0 ? -1 : a.season_number - b.season_number
  );

  return (
    <section className="pt-10 border-t border-[var(--taupe)]/15">
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="font-display text-2xl text-[var(--cream)]">Seasons</h2>
        <span className="font-arabic text-sm text-[var(--saffron)]/70">المواسم</span>
        <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">
          {sorted.length}
        </span>
      </div>

      <div className="space-y-1.5">
        {sorted.map((s) => {
          const isOpen = open === s.id;
          const yr = s.air_date ? new Date(s.air_date).getFullYear() : null;
          const label = s.name || (s.season_number === 0 ? "Specials" : `Season ${s.season_number}`);

          return (
            <div
              key={s.id}
              className={cn(
                "rounded-sm border transition-colors duration-200",
                isOpen
                  ? "border-[var(--saffron)]/40 bg-[var(--ink-lift)]"
                  : "border-[var(--taupe)]/15 bg-[var(--ink-lift)]/50 hover:border-[var(--taupe)]/30"
              )}
            >
              {/* Header row — always visible */}
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="w-full flex items-center gap-4 px-4 py-3 text-left"
              >
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--saffron)] w-8 shrink-0">
                  {s.season_number === 0 ? "SP" : `S${String(s.season_number).padStart(2, "0")}`}
                </span>
                <span className="font-display text-[15px] text-[var(--cream)] flex-1 truncate">
                  {label}
                </span>
                <div className="flex items-center gap-3 shrink-0">
                  {yr && (
                    <span className="font-mono text-[11px] text-[var(--cream-muted)]">{yr}</span>
                  )}
                  {s.episode_count != null && (
                    <span className="flex items-center gap-1 font-mono text-[11px] text-[var(--cream-muted)]">
                      <Tv size={11} /> {s.episode_count} ep
                    </span>
                  )}
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-[var(--cream-muted)] transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="flex gap-4 px-4 pb-4 pt-1 border-t border-[var(--taupe)]/15">
                  {/* Season poster */}
                  <div className="w-[80px] shrink-0">
                    {s.poster_url ? (
                      <img
                        src={s.poster_url}
                        alt={label}
                        className="w-full aspect-[2/3] object-cover rounded-sm border border-[var(--taupe)]/20"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] rounded-sm bg-[var(--ink-high)] border border-[var(--taupe)]/15 flex items-center justify-center text-[var(--cream-muted)]">
                        <Tv size={20} strokeWidth={1} />
                      </div>
                    )}
                  </div>

                  {/* Overview */}
                  <div className="flex-1 min-w-0">
                    {s.air_date && (
                      <p className="font-mono text-[10px] tracking-[0.2em] uppercase text-[var(--saffron)]/70 mb-2">
                        {new Date(s.air_date).toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                        {s.episode_count != null && ` · ${s.episode_count} episodes`}
                      </p>
                    )}
                    {s.overview ? (
                      <p className="text-sm leading-relaxed text-[var(--cream)]/80 line-clamp-4">
                        {s.overview}
                      </p>
                    ) : (
                      <p className="text-sm text-[var(--cream-muted)] italic">No overview available.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
