"use client";

import { useEffect, useRef } from "react";

/**
 * A soft saffron halo that trails the cursor. Very subtle — adds warmth
 * without distracting. Only renders on pointer-fine devices.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    const el = ref.current; if (!el) return;
    let x = window.innerWidth / 2, y = window.innerHeight / 2;
    let tx = x, ty = y, raf = 0;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    const loop = () => {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      el.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    loop();
    return () => { window.removeEventListener("pointermove", onMove); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed top-0 left-0 z-[5] h-[600px] w-[600px] will-change-transform"
      style={{
        background:
          "radial-gradient(closest-side, rgba(100,120,220,0.07), rgba(100,120,220,0.02) 40%, transparent 72%)",
        filter: "blur(30px)",
      }}
    />
  );
}
