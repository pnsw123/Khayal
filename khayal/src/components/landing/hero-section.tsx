"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { LineWaves } from "./line-waves";
import ShinyText from "./shiny-text";

const LETTERS = ["K", "H", "A", "Y", "A", "L"];

export function HeroSection() {
  const prefersReduced = useReducedMotion();

  return (
    <section
      className="relative flex flex-col items-center justify-center overflow-hidden"
      style={{ minHeight: "100vh", background: "var(--ink)" }}
      data-testid="hero-section"
    >
      {/* LineWaves WebGL background */}
      {!prefersReduced && (
        <LineWaves
          speed={0.2}
          innerLineCount={24}
          outerLineCount={28}
          warpIntensity={0.7}
          rotation={-35}
          edgeFadeWidth={0.15}
          colorCycleSpeed={0.3}
          brightness={0.12}
          color1="#b8b4cc"
          color2="#8888b0"
          color3="#3a3a58"
          enableMouseInteraction={true}
          mouseInfluence={1.4}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 gap-6">
        {/* Eyebrow — ReactBits ShinyText sheen (brand cream over muted) */}
        <motion.div
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <ShinyText
            text="KHAYAL CINEMA DATABASE"
            className="font-mono uppercase tracking-[0.4em] text-[13px]"
            color="var(--cream-muted)"
            shineColor="var(--cream)"
            speed={4}
            disabled={!!prefersReduced}
          />
        </motion.div>

        {/* Main headline — split by letter */}
        <h1
          className="font-display leading-none select-none"
          style={{
            fontSize: "clamp(5rem, 14vw, 10rem)",
            color: "var(--cream)",
            letterSpacing: "-0.03em",
          }}
        >
          {LETTERS.map((char, i) => (
            <motion.span
              key={i}
              className="inline-block"
              initial={prefersReduced ? {} : { opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              {char}
            </motion.span>
          ))}
        </h1>

        {/* Arabic subtitle */}
        <motion.p
          className="font-arabic"
          style={{
            fontSize: "clamp(1.5rem, 4vw, 2.5rem)",
            color: "var(--cream-muted)",
          }}
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.6 }}
        >
          خيال
        </motion.p>

        {/* Tagline */}
        <motion.p
          className="font-display italic"
          style={{
            fontSize: "clamp(1rem, 2vw, 1.25rem)",
            color: "color-mix(in srgb, var(--cream-muted) 80%, transparent)",
            maxWidth: "30ch",
          }}
          initial={prefersReduced ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.9 }}
        >
          A library of imagination.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex items-center gap-4 flex-wrap justify-center mt-2"
          initial={prefersReduced ? {} : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2, ease: [0.22, 1, 0.36, 1] }}
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

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        initial={prefersReduced ? {} : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
        aria-hidden
      >
        <motion.span
          className="font-mono text-[10px] tracking-[0.25em] uppercase"
          style={{ color: "color-mix(in srgb, var(--cream-muted) 40%, transparent)" }}
          animate={prefersReduced ? {} : { y: [0, 5, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          scroll
        </motion.span>
        <motion.svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          style={{ color: "color-mix(in srgb, var(--cream-muted) 40%, transparent)" }}
          animate={prefersReduced ? {} : { y: [0, 4, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.1 }}
        >
          <path d="M8 3v10M3 9l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.div>
    </section>
  );
}
