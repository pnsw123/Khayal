"use client";

import { CircularGallery } from "./circular-gallery";

interface GalleryItem {
  image: string;
  text: string;
}

export function GallerySection({ items }: { items: GalleryItem[] }) {
  if (!items.length) return null;

  return (
    <section style={{ background: "var(--ink)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
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
        <CircularGallery
          items={items}
          bend={3}
          textColor="#eeeef8"
          borderRadius={0.05}
          font="bold 18px monospace"
          scrollSpeed={2}
          scrollEase={0.05}
        />
      </div>
    </section>
  );
}
