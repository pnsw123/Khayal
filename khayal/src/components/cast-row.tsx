"use client";

import { User } from "lucide-react";

export interface CastMember {
  person_id: number;
  name: string;
  character_name: string | null;
  profile_path: string | null;
  role: "cast" | "crew";
  job: string | null;
  credit_order: number;
}

export function CastRow({ cast }: { cast: CastMember[] }) {
  if (!cast.length) return null;

  const director = cast.find((c) => c.role === "crew" && c.job === "Director");
  const actors = cast.filter((c) => c.role === "cast").slice(0, 12);

  return (
    <section className="pt-10 border-t border-[var(--taupe)]/15">
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="font-display text-2xl text-[var(--cream)]">Cast</h2>
        <span className="font-arabic text-sm text-[var(--saffron)]/70">طاقم العمل</span>
      </div>

      {/* Director pill */}
      {director && (
        <div className="flex items-center gap-2 mb-5">
          <span className="font-mono text-[10px] tracking-[0.25em] uppercase text-[var(--cream-muted)]">Directed by</span>
          <span className="px-3 py-1 rounded-sm bg-[var(--ink-lift)] border border-[var(--saffron)]/30 text-sm text-[var(--cream)] font-display italic">
            {director.name}
          </span>
        </div>
      )}

      {/* Actor scroll row */}
      <div className="relative -mx-6 px-6 overflow-x-auto scroll-smooth">
        <div className="flex gap-4 pb-3 min-w-max">
          {actors.map((a) => (
            <div key={a.person_id} className="w-[100px] shrink-0 group">
              {/* Photo */}
              <div className="w-[100px] h-[100px] rounded-full overflow-hidden border-2 border-[var(--taupe)]/20 group-hover:border-[var(--saffron)]/50 transition-colors bg-[var(--ink-lift)] mb-2.5 mx-auto">
                {a.profile_path ? (
                  <img
                    src={a.profile_path}
                    alt={a.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[var(--cream-muted)]">
                    <User size={32} strokeWidth={1} />
                  </div>
                )}
              </div>
              {/* Name */}
              <p className="text-center text-[12px] font-display text-[var(--cream)] leading-tight line-clamp-2">
                {a.name}
              </p>
              {/* Character */}
              {a.character_name && (
                <p className="text-center font-mono text-[10px] text-[var(--cream-muted)] mt-0.5 line-clamp-1">
                  {a.character_name}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
