"use client";

import { useInView, useMotionValue, useSpring } from "motion/react";
import { useCallback, useEffect, useRef } from "react";
import { SpringReveal } from "./spring-reveal";
import { GlowingEffect } from "@/components/ui/glowing-effect";

// ReactBits CountUp — verbatim TypeScript port
function CountUp({
  to,
  from = 0,
  separator = ",",
  duration = 2,
  className = "",
}: {
  to: number;
  from?: number;
  separator?: string;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(from);
  const damping = 20 + 40 * (1 / duration);
  const stiffness = 100 * (1 / duration);
  const springValue = useSpring(motionValue, { damping, stiffness });
  const isInView = useInView(ref, { once: true, margin: "0px" });

  const formatValue = useCallback(
    (latest: number) => {
      return Intl.NumberFormat("en-US", {
        useGrouping: !!separator,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })
        .format(latest)
        .replace(/,/g, separator);
    },
    [separator]
  );

  useEffect(() => {
    if (ref.current) ref.current.textContent = formatValue(from);
  }, [from, formatValue]);

  useEffect(() => {
    if (isInView) motionValue.set(to);
  }, [isInView, motionValue, to]);

  useEffect(() => {
    const unsub = springValue.on("change", (latest) => {
      if (ref.current) ref.current.textContent = formatValue(latest);
    });
    return () => unsub();
  }, [springValue, formatValue]);

  return <span className={className} ref={ref} />;
}

interface StatsSectionProps {
  filmCount: number;
  ratingCount: number;
  reviewCount: number;
}

const STATS = [
  { label: "Films catalogued", arabic: "فيلم مفهرس", key: "filmCount" as const },
  { label: "Ratings cast", arabic: "تقييم مسجّل", key: "ratingCount" as const },
  { label: "Reviews written", arabic: "مراجعة مكتوبة", key: "reviewCount" as const },
];

export function StatsSection(props: StatsSectionProps) {
  return (
    <section style={{ background: "var(--ink)", padding: "6rem 1.5rem", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center" }}>
      <div className="mx-auto max-w-[1200px]">
        <p
          className="font-mono text-center text-[10px] tracking-[0.4em] uppercase mb-16"
          style={{ color: "var(--cream-muted)", opacity: 0.5 }}
        >
          By the numbers بالأرقام
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-12">
          {STATS.map((stat, i) => (
            <SpringReveal
              key={stat.label}
              rotate={i === 0 ? -10 : i === 2 ? 10 : 0}
              amount={0.8}
              yFrom={300}
              delay={i * 0.15}
            >
              <div
                className="relative flex flex-col items-center text-center px-8 py-10 rounded-2xl"
                style={{
                  background: "var(--ink-lift)",
                  border: "1px solid color-mix(in srgb, var(--taupe) 35%, transparent)",
                }}
              >
                <GlowingEffect spread={40} glow proximity={64} inactiveZone={0.01} />
                <p
                  className="font-display leading-none mb-4"
                  style={{
                    fontSize: "clamp(4rem,8vw,7rem)",
                    color: "var(--cream)",
                    letterSpacing: "-0.04em",
                  }}
                >
                  <CountUp to={props[stat.key]} separator="," duration={2.5} />
                </p>
                <p
                  className="font-mono text-[11px] tracking-[0.3em] uppercase mb-1"
                  style={{ color: "var(--cream-muted)" }}
                >
                  {stat.label}
                </p>
                <p className="font-arabic text-sm" style={{ color: "var(--saffron)", opacity: 0.6 }}>
                  {stat.arabic}
                </p>
              </div>
            </SpringReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
