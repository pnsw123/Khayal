"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from "react";
import { gsap } from "gsap";

// ReactBits Masonry — verbatim TypeScript port

export interface MasonryItem {
  id: number | string;
  img: string;
  url: string;
  height: number;
}

interface GridItem extends MasonryItem {
  x: number;
  y: number;
  w: number;
  h: number;
}

function useMedia<T>(queries: string[], values: T[], defaultValue: T): T {
  const get = () => values[queries.findIndex((q) => matchMedia(q).matches)] ?? defaultValue;
  const [value, setValue] = useState<T>(get);
  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach((q) => matchMedia(q).addEventListener("change", handler));
    return () => queries.forEach((q) => matchMedia(q).removeEventListener("change", handler));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return value;
}

function useMeasure(): [React.RefObject<HTMLDivElement | null>, { width: number; height: number }] {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, size];
}

async function preloadImages(urls: string[]) {
  await Promise.all(
    urls.map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = () => resolve();
        })
    )
  );
}

interface MasonryProps {
  items: MasonryItem[];
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: "top" | "bottom" | "left" | "right" | "center" | "random";
  scaleOnHover?: boolean;
  hoverScale?: number;
  blurToFocus?: boolean;
}

export function MasonryGallery({
  items,
  ease = "power3.out",
  duration = 0.6,
  stagger = 0.05,
  animateFrom = "bottom",
  scaleOnHover = true,
  hoverScale = 0.95,
  blurToFocus = true,
}: MasonryProps) {
  const columns = useMedia(
    ["(min-width:1500px)", "(min-width:1000px)", "(min-width:600px)", "(min-width:400px)"],
    [5, 4, 3, 2],
    1
  );
  const [containerRef, { width }] = useMeasure();
  const [imagesReady, setImagesReady] = useState(false);
  const hasMounted = useRef(false);

  useEffect(() => {
    preloadImages(items.map((i) => i.img)).then(() => setImagesReady(true));
  }, [items]);

  const grid = useMemo<GridItem[]>(() => {
    if (!width) return [];
    const colHeights = new Array(columns).fill(0) as number[];
    const columnWidth = width / columns;
    return items.map((child) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col;
      const height = child.height / 2;
      const y = colHeights[col];
      colHeights[col] += height;
      return { ...child, x, y, w: columnWidth, h: height };
    });
  }, [columns, items, width]);

  useLayoutEffect(() => {
    if (!imagesReady) return;
    grid.forEach((item, index) => {
      const selector = `[data-key="${item.id}"]`;
      const animationProps = { x: item.x, y: item.y, width: item.w, height: item.h };
      if (!hasMounted.current) {
        let initX = item.x;
        let initY = item.y;
        if (animateFrom === "bottom") initY = item.y + 100;
        else if (animateFrom === "top") initY = -200;
        gsap.fromTo(
          selector,
          {
            opacity: 0,
            x: initX,
            y: initY,
            width: item.w,
            height: item.h,
            ...(blurToFocus && { filter: "blur(10px)" }),
          },
          {
            opacity: 1,
            ...animationProps,
            ...(blurToFocus && { filter: "blur(0px)" }),
            duration: 0.8,
            ease: "power3.out",
            delay: index * stagger,
          }
        );
      } else {
        gsap.to(selector, { ...animationProps, duration, ease, overwrite: "auto" as const });
      }
    });
    hasMounted.current = true;
  }, [grid, imagesReady, stagger, animateFrom, blurToFocus, duration, ease]);

  const handleMouseEnter = useCallback(
    (_e: React.MouseEvent, item: GridItem) => {
      if (scaleOnHover)
        gsap.to(`[data-key="${item.id}"]`, { scale: hoverScale, duration: 0.3, ease: "power2.out" });
    },
    [scaleOnHover, hoverScale]
  );

  const handleMouseLeave = useCallback(
    (_e: React.MouseEvent, item: GridItem) => {
      if (scaleOnHover)
        gsap.to(`[data-key="${item.id}"]`, { scale: 1, duration: 0.3, ease: "power2.out" });
    },
    [scaleOnHover]
  );

  const totalHeight = grid.reduce((max, item) => Math.max(max, item.y + item.h), 0);

  return (
    <div
      ref={containerRef}
      style={{ position: "relative", width: "100%", height: totalHeight || "auto", minHeight: 400 }}
    >
      {grid.map((item) => (
        <div
          key={item.id}
          data-key={item.id}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: 6,
            cursor: "pointer",
            willChange: "transform, opacity",
          }}
          onClick={() => {
            if (item.url) window.location.href = item.url;
          }}
          onMouseEnter={(e) => handleMouseEnter(e, item)}
          onMouseLeave={(e) => handleMouseLeave(e, item)}
        >
          <div
            style={{
              backgroundImage: `url(${item.img})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              width: "100%",
              height: "100%",
              borderRadius: 10,
              boxShadow: "0px 10px 50px -10px rgba(0,0,0,0.4)",
            }}
          />
        </div>
      ))}
    </div>
  );
}
