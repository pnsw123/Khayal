"use client";

import { useAmbientColor } from "@/hooks/use-ambient-color";

interface AmbientBackdropProps {
  posterUrl: string | null;
}

export function AmbientBackdrop({ posterUrl }: AmbientBackdropProps) {
  const color = useAmbientColor(posterUrl);

  if (!color) return null;

  const { r, g, b } = color;

  return (
    <div
      aria-hidden
      data-testid="ambient-backdrop"
      className="absolute inset-0 pointer-events-none transition-all duration-300"
      style={{
        background: `radial-gradient(ellipse at top, rgba(${r},${g},${b},0.35) 0%, transparent 70%)`,
      }}
    />
  );
}
