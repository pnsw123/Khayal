"use client";

import { useReducedMotion } from "motion/react";
import LightRays from "./light-rays";

/**
 * Violet light beam from the top-left corner, behind listing pages.
 * Place inside a `relative isolate` container; it sits at -z-10 there.
 */
export function PageGlow() {
  const reduced = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[760px] -z-10 overflow-hidden">
      <LightRays
        raysOrigin="top-left"
        raysColor="#7c3aed"
        raysSpeed={reduced ? 0 : 0.5}
        lightSpread={1.2}
        rayLength={1.4}
        glow={1}
        haze={0.6}
        intensity={1.4}
        fadeDistance={0.9}
        followMouse={false}
        cursorShadow={false}
        clickPulse={false}
        intro={!reduced}
      />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-b from-transparent to-black" />
    </div>
  );
}
