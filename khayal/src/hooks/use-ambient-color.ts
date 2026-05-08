"use client";

import { useState, useEffect } from "react";

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

function relativeLuminance(r: number, g: number, b: number): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function darken(value: number, amount: number): number {
  return Math.max(0, Math.round(value * (1 - amount)));
}

export function processColor(raw: [number, number, number]): RgbColor {
  const [r, g, b] = raw;
  const lum = relativeLuminance(r, g, b);
  if (lum > 0.4) {
    return { r: darken(r, 0.4), g: darken(g, 0.4), b: darken(b, 0.4) };
  }
  return { r, g, b };
}

export function useAmbientColor(posterUrl: string | null): RgbColor | null {
  const [color, setColor] = useState<RgbColor | null>(null);

  useEffect(() => {
    if (!posterUrl) {
      setColor(null);
      return;
    }

    let cancelled = false;

    import("colorthief").then(({ getColor }) => {
      getColor(posterUrl)
        .then((raw) => {
          if (!cancelled) {
            setColor(processColor(raw as unknown as [number, number, number]));
          }
        })
        .catch(() => {
          if (!cancelled) setColor(null);
        });
    }).catch(() => {
      if (!cancelled) setColor(null);
    });

    return () => { cancelled = true; };
  }, [posterUrl]);

  return color;
}
