"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

// Film strip icon — matches icon.svg in src/app/
function FilmIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect x="4" y="8" width="24" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.9" />
      <rect x="8" y="10" width="16" height="12" rx="1" fill="currentColor" opacity="0.12" />
      <path d="M13.5 13.5 L13.5 18.5 L19 16 Z" fill="currentColor" opacity="0.9" />
      <rect x="5.5" y="10" width="1.5" height="2" rx="0.4" fill="currentColor" opacity="0.5" />
      <rect x="5.5" y="14" width="1.5" height="2" rx="0.4" fill="currentColor" opacity="0.5" />
      <rect x="5.5" y="18" width="1.5" height="2" rx="0.4" fill="currentColor" opacity="0.5" />
      <rect x="25" y="10" width="1.5" height="2" rx="0.4" fill="currentColor" opacity="0.5" />
      <rect x="25" y="14" width="1.5" height="2" rx="0.4" fill="currentColor" opacity="0.5" />
      <rect x="25" y="18" width="1.5" height="2" rx="0.4" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export function CTASection() {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center text-center px-6"
      style={{ minHeight: "100vh", background: "var(--ink)" }}
    >
      <div className="flex flex-col items-center gap-6 max-w-xl">

        {/* Film icon */}
        <motion.div
          style={{ color: "var(--cream-muted)" }}
          initial={prefersReduced ? {} : { opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.5 }}
        >
          <FilmIcon />
        </motion.div>

        {/* Headline */}
        <motion.h2
          className="font-display"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
            color: "var(--cream)",
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
          }}
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          Track what you watch.
        </motion.h2>

        {/* Subline */}
        <motion.p
          className="font-mono text-[13px] tracking-wide"
          style={{ color: "var(--cream-muted)", opacity: 0.7 }}
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 0.7 } : {}}
          transition={{ duration: 0.6, delay: 0.35 }}
        >
          7,000+ films and series, rated and reviewed by real people.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex items-center gap-3 flex-wrap justify-center"
          initial={prefersReduced ? {} : { opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Link
            href="/browse"
            className="h-11 px-7 rounded-md font-medium text-sm transition-colors inline-flex items-center gap-2"
            style={{ background: "var(--accent)", color: "var(--ink)" }}
            data-testid="cta-browse"
          >
            Browse Films
          </Link>
          <Link
            href="/login"
            className="h-11 px-7 rounded-md text-sm transition-colors inline-flex items-center"
            style={{
              border: "1px solid color-mix(in srgb, var(--cream) 20%, transparent)",
              color: "var(--cream)",
            }}
            data-testid="cta-signin"
          >
            Sign In
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
