"use client";

// ReactBits ScrollVelocity — verbatim TypeScript port
// Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/TextAnimations/ScrollVelocity/ScrollVelocity.jsx

import { useRef, useLayoutEffect, useState } from "react";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
} from "motion/react";

function useElementWidth(ref: React.RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    function update() {
      if (ref.current) setWidth(ref.current.offsetWidth);
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [ref]);
  return width;
}

function wrap(min: number, max: number, v: number): number {
  const range = max - min;
  return (((v - min) % range) + range) % range + min;
}

function VelocityRow({
  children,
  baseVelocity = 80,
  numCopies = 5,
}: {
  children: React.ReactNode;
  baseVelocity?: number;
  numCopies?: number;
}) {
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, { damping: 50, stiffness: 400 });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], { clamp: false });

  const copyRef = useRef<HTMLSpanElement>(null);
  const copyWidth = useElementWidth(copyRef);

  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return "0px";
    return `${wrap(-copyWidth, 0, v)}px`;
  });

  const dir = useRef(1);
  useAnimationFrame((_t, delta) => {
    let moveBy = dir.current * baseVelocity * (delta / 1000);
    if (velocityFactor.get() < 0) dir.current = -1;
    else if (velocityFactor.get() > 0) dir.current = 1;
    moveBy += dir.current * moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div style={{ overflow: "hidden", display: "flex" }}>
      <motion.div style={{ x, display: "flex", whiteSpace: "nowrap" }}>
        {Array.from({ length: numCopies }, (_, i) => (
          <span key={i} ref={i === 0 ? copyRef : null} style={{ whiteSpace: "nowrap" }}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export function FilmTicker({ titles }: { titles: string[] }) {
  const text = titles.join("  ·  ") + "  ·  ";
  return (
    <section
      style={{ background: "var(--ink)", padding: "3rem 0", overflow: "hidden" }}
      aria-hidden
    >
      <VelocityRow baseVelocity={55} numCopies={4}>
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            color: "var(--cream)",
            opacity: 0.12,
            letterSpacing: "-0.02em",
          }}
        >
          {text}
        </span>
      </VelocityRow>
      <div style={{ marginTop: "1rem" }}>
        <VelocityRow baseVelocity={-40} numCopies={4}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "clamp(0.65rem, 1vw, 0.8rem)",
              color: "var(--cream-muted)",
              opacity: 0.2,
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}
          >
            {text}
          </span>
        </VelocityRow>
      </div>
    </section>
  );
}
