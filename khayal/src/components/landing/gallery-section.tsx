"use client";

// CircularGallery is lazy-mounted only when section enters viewport.
// This prevents two simultaneous OGL WebGL contexts (LineWaves + CircularGallery)
// from conflicting and crashing the page.

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";

const CircularGallery = dynamic(
  () => import("./circular-gallery").then((m) => ({ default: m.CircularGallery })),
  { ssr: false }
);

interface GalleryItem {
  image: string;
  text: string;
}

export function GallerySection({ items }: { items: GalleryItem[] }) {
  const sectionRef = useRef<HTMLElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!items.length) return null;

  return (
    <section
      ref={sectionRef}
      style={{
        background: "var(--ink)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div className="mx-auto max-w-[1600px] px-6 pt-20 pb-6">
        <p
          className="font-mono text-[10px] tracking-[0.35em] uppercase mb-3"
          style={{ color: "var(--cream-muted)", opacity: 0.5 }}
        >
          Most acclaimed
        </p>
        <h2
          className="font-display text-4xl md:text-6xl"
          style={{ color: "var(--cream)", letterSpacing: "-0.02em" }}
        >
          Now Showing
        </h2>
      </div>
      <div style={{ flex: 1, minHeight: "70vh" }}>
        {mounted && (
          <CircularGallery
            items={items}
            bend={3}
            textColor="#eeeef8"
            borderRadius={0.05}
            font="bold 18px monospace"
            scrollSpeed={2}
            scrollEase={0.05}
          />
        )}
      </div>
    </section>
  );
}
