"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
const WORDS = ["Every", "frame", "tells", "a", "story."];

export function CTASection() {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      ref={ref}
      className="relative flex flex-col items-center justify-center text-center overflow-hidden py-32 px-6"
      style={{ minHeight: "100vh", background: "var(--ink)" }}
    >

      <div className="relative z-10 flex flex-col items-center gap-5 max-w-3xl">
        {/* Arabic label */}
        <motion.p
          className="font-arabic text-sm tracking-wider"
          style={{ color: "color-mix(in srgb, var(--rose) 70%, transparent)" }}
          initial={prefersReduced ? {} : { opacity: 0, y: 10 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
        >
          ابدأ رحلتك
        </motion.p>

        {/* BlurText headline */}
        <h2
          className="font-display"
          style={{
            fontSize: "clamp(2.5rem, 6vw, 4rem)",
            color: "var(--cream)",
            lineHeight: 1.1,
          }}
        >
          {WORDS.map((word, i) => (
            <motion.span
              key={i}
              className="inline-block mr-[0.3em]"
              initial={prefersReduced ? {} : { opacity: 0, filter: "blur(12px)", y: 10 }}
              animate={
                inView
                  ? { opacity: 1, filter: "blur(0px)", y: 0 }
                  : {}
              }
              transition={{
                duration: 0.6,
                delay: i * 0.1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {word}
            </motion.span>
          ))}
        </h2>

        {/* Subline */}
        <motion.p
          className="text-sm"
          style={{ color: "var(--cream-muted)" }}
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
        >
          Join thousands tracking what they watch.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex items-center gap-4 flex-wrap justify-center mt-3"
          initial={prefersReduced ? {} : { opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.75 }}
        >
          <Link
            href="/browse"
            className="h-11 px-6 rounded-md font-medium text-sm transition-colors inline-flex items-center"
            style={{ background: "var(--accent)", color: "var(--ink)" }}
          >
            Browse Films
          </Link>
          <Link
            href="/login"
            className="h-11 px-6 rounded-md text-sm transition-colors inline-flex items-center"
            style={{
              border: "1px solid color-mix(in srgb, var(--taupe) 40%, transparent)",
              color: "var(--cream)",
            }}
          >
            Sign In
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
