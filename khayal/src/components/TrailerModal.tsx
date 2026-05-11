"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
type AnyProps = Record<string, unknown>;
const ReactPlayer = dynamic<AnyProps>(() => import("react-player"), { ssr: false });

interface TrailerModalProps {
  trailerUrl: string;
  title: string;
}

export function TrailerModal({ trailerUrl, title }: TrailerModalProps) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={`Watch trailer for ${title}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md font-mono text-[11px] tracking-[0.15em] uppercase bg-[var(--saffron)] text-[var(--ink)] font-semibold hover:opacity-90 active:scale-95 transition-all"
      >
        <span aria-hidden>▶</span> Watch Trailer
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trailer for ${title}`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/90"
            onClick={close}
            aria-hidden="true"
          />

          {/* Modal content */}
          <div className="relative z-10 w-full max-w-5xl aspect-video">
            {/* Close button */}
            <button
              onClick={close}
              aria-label="Close trailer"
              className="absolute -top-10 right-0 text-white/70 hover:text-white font-mono text-2xl leading-none transition-colors"
            >
              ×
            </button>

            <ReactPlayer
              url={trailerUrl}
              width="100%"
              height="100%"
              playing={open}
              controls
              config={{
                playerVars: {
                  autoplay: 1,
                  modestbranding: 1,
                  rel: 0,
                },
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
