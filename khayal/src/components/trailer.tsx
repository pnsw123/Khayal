"use client";

import { useState } from "react";
import { Play, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface TrailerProps {
  /** YouTube video ID. If null/empty, we fall back to a YouTube search link. */
  youtubeId: string | null;
  title: string;
  year: string | null;
  className?: string;
}

/**
 * Trailer embed — click-to-load YouTube iframe (doesn't auto-play; keeps
 * detail pages fast). Falls back to a YouTube search link when we don't
 * have a TMDB-sourced video ID for the title.
 */
export function Trailer({ youtubeId, title, year, className }: TrailerProps) {
  const [open, setOpen] = useState(false);

  if (!youtubeId) {
    // Fallback — no trailer on file, hand off to a YouTube search
    const q = encodeURIComponent(`${title} ${year ?? ""} official trailer`.trim());
    return (
      <a
        href={`https://www.youtube.com/results?search_query=${q}`}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group inline-flex items-center gap-2 h-9 px-3 rounded-md",
          "border border-[var(--taupe)]/40 text-[var(--cream)] text-xs font-mono tracking-wider uppercase",
          "hover:border-[var(--saffron)]/60 hover:text-[var(--saffron)] transition-colors",
          className,
        )}
      >
        <Play size={12} className="fill-current" />
        Find trailer
        <ExternalLink size={11} className="ml-1 opacity-70 group-hover:opacity-100" />
      </a>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={cn(
          "group relative inline-flex items-center gap-2 h-9 px-3 rounded-md",
          "border border-[var(--taupe)]/40 text-[var(--cream)] text-xs font-mono tracking-wider uppercase",
          "hover:border-[var(--saffron)]/60 hover:text-[var(--saffron)] transition-colors",
          className,
        )}
      >
        <Play size={12} className="fill-current" />
        Watch trailer
      </button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <div className="relative aspect-video w-full rounded-md overflow-hidden bg-[var(--ink-lift)] border border-[var(--saffron)]/30">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
          title={`${title} — trailer`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
      <button
        onClick={() => setOpen(false)}
        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-[var(--ink)]/90 backdrop-blur text-[var(--cream)] border border-[var(--taupe)]/30 grid place-items-center hover:bg-[var(--danger)] hover:text-white transition-colors"
        aria-label="Close trailer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
