"use client";
import { useRef } from "react";
import { motion, useInView, useSpring, useTransform } from "motion/react";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });
  const spring = useSpring(0, { stiffness: 60, damping: 20 });
  const display = useTransform(spring, (v) => Math.round(v).toLocaleString() + suffix);

  if (inView) spring.set(value);

  return <motion.span ref={ref}>{display}</motion.span>;
}

interface StatsSectionProps {
  filmCount: number;
  ratingCount: number;
  reviewCount: number;
}

const STATS = [
  {
    label: "Films catalogued",
    arabicLabel: "فيلم مفهرس",
    getValue: (p: StatsSectionProps) => p.filmCount,
  },
  {
    label: "Ratings cast",
    arabicLabel: "تقييم مسجّل",
    getValue: (p: StatsSectionProps) => p.ratingCount,
  },
  {
    label: "Reviews written",
    arabicLabel: "مراجعة مكتوبة",
    getValue: (p: StatsSectionProps) => p.reviewCount,
  },
];

export function StatsSection(props: StatsSectionProps) {
  return (
    <section
      className="relative"
      style={{
        background: "linear-gradient(to bottom, var(--ink), var(--ink-lift), var(--ink))",
        padding: "6rem 1.5rem",
      }}
    >
      <div className="mx-auto max-w-[1200px]">
        {/* Label */}
        <p
          className="font-mono text-center text-[10px] tracking-[0.4em] uppercase mb-16"
          style={{ color: "var(--cream-muted)", opacity: 0.5 }}
        >
          By the numbers — بالأرقام
        </p>

        {/* Stats grid */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-16 md:gap-0 md:divide-x"
          style={{ borderColor: "color-mix(in srgb, var(--taupe) 20%, transparent)" }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center px-8">
              <p
                className="font-display leading-none mb-4"
                style={{
                  fontSize: "clamp(4rem, 8vw, 7rem)",
                  color: "var(--cream)",
                  letterSpacing: "-0.04em",
                }}
              >
                <AnimatedNumber value={stat.getValue(props)} />
              </p>
              <p
                className="font-mono text-[11px] tracking-[0.3em] uppercase mb-1"
                style={{ color: "var(--cream-muted)" }}
              >
                {stat.label}
              </p>
              <p
                className="font-arabic text-sm"
                style={{ color: "var(--saffron)", opacity: 0.6 }}
              >
                {stat.arabicLabel}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
