import { ExternalLink } from "lucide-react";
import { Trailer } from "./trailer";

export interface WhereToWatchProps {
  title: string;
  year: string | null;
  trailerYoutubeId?: string | null;
}

/**
 * "Where to watch" + "Watch trailer" hand-off block.
 * KHAYAL is an index — it doesn't stream. These links send the user to the
 * right external source (trailer on YouTube, rentals via JustWatch, credits
 * via Letterboxd / IMDb).
 */
export function WhereToWatch({ title, year, trailerYoutubeId }: WhereToWatchProps) {
  const qBase = `${title} ${year ?? ""}`.trim();
  const q = encodeURIComponent(qBase);

  const links = [
    {
      label: "JustWatch",
      sublabel: "Stream & Rent",
      href: `https://www.justwatch.com/us/search?q=${q}`,
    },
    {
      label: "Letterboxd",
      sublabel: "Reviews",
      href: `https://letterboxd.com/search/${q}/`,
    },
    {
      label: "IMDb",
      sublabel: "Info",
      href: `https://www.imdb.com/find?q=${q}`,
    },
  ];

  return (
    <div className="pt-6 border-t border-[var(--ink-high)]">
      <div className="flex items-baseline justify-between mb-3">
        <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--saffron)]">
          Where to watch
        </p>
        <p className="font-arabic text-xs text-[var(--saffron)]/70">أين تشاهد</p>
      </div>

      {/* Trailer — embed if we have a TMDB-sourced id, else YouTube search */}
      <div className="mb-4">
        <Trailer youtubeId={trailerYoutubeId ?? null} title={title} year={year} />
      </div>

      <p className="text-xs text-[var(--cream-muted)] mb-3 leading-relaxed">
        KHAYAL indexes films. We don&apos;t stream. Rentals &amp; credits:
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 h-10 px-3 rounded-md bg-[var(--ink)] border border-[var(--taupe)]/25 hover:border-[var(--saffron)]/50 hover:text-[var(--saffron)] text-[var(--cream)] transition-colors"
          >
            <ExternalLink size={12} />
            <span className="flex flex-col">
              <span className="text-xs font-mono uppercase tracking-wider">{l.label}</span>
              <span className="text-[10px] text-[var(--cream-muted)]">{l.sublabel}</span>
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
