"use client";

import { useRef, useEffect } from "react";
import { motion, useInView, useSpring, useTransform, useReducedMotion } from "motion/react";

interface StatsSectionProps {
  filmCount: number;
  ratingCount: number;
  reviewCount: number;
}

function AnimatedStat({ value, label }: { value: number; label: string }) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const spring = useSpring(0, { stiffness: 50, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString("en-US"));

  useEffect(() => {
    if (inView && !prefersReduced) {
      spring.set(value);
    }
  }, [inView, prefersReduced, spring, value]);

  return (
    <motion.div
      ref={ref}
      className="flex flex-col items-center text-center px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.span
        className="font-display"
        style={{
          fontSize: "clamp(3rem, 7vw, 5.5rem)",
          color: "var(--cream)",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {prefersReduced ? value.toLocaleString("en-US") : display}
      </motion.span>
      <p
        className="font-mono text-[11px] tracking-[0.3em] uppercase mt-3"
        style={{ color: "var(--cream-muted)" }}
      >
        {label}
      </p>
    </motion.div>
  );
}

export function StatsSection({ filmCount, ratingCount, reviewCount }: StatsSectionProps) {
  const stats = [
    { value: filmCount,   label: "Films catalogued" },
    { value: ratingCount, label: "Ratings cast"      },
    { value: reviewCount, label: "Reviews written"   },
  ];

  return (
    <section
      className="py-24"
      style={{
        background: "linear-gradient(to bottom, var(--ink), color-mix(in srgb, var(--ink-lift) 30%, transparent), var(--ink))",
      }}
    >
      <div className="mx-auto max-w-[1600px] px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--taupe)]/20">
          {stats.map((s) => (
            <AnimatedStat key={s.label} value={s.value} label={s.label} />
          ))}
        </div>
      </div>
    </section>
  );
}
