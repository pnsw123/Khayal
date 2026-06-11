"use client";

import { motion, useReducedMotion, type Variants } from "motion/react";

/**
 * SpringReveal — faithful port of the motion.dev scroll-triggered card reveal.
 *
 * Source pattern (motion.dev "Scroll-triggered animations" example):
 *   <motion.div initial="offscreen" whileInView="onscreen" viewport={{ amount: 0.8 }}>
 *     <motion.div variants={cardVariants} />
 *   </motion.div>
 *   const cardVariants = {
 *     offscreen: { y: 300 },
 *     onscreen: { y: 50, rotate: -10, transition: { type: "spring", bounce: 0.4, duration: 0.8 } },
 *   }
 *
 * The pronounced spring (bounce 0.4) is the goal. `rotate` is a prop because a
 * -10° tilt reads as "broken" on a full-bleed section block — it only looks
 * right on discrete cards. Callers pass a small `rotate` (or 0) for wide blocks
 * and the full -10 for card-shaped children. Opacity is added so the element
 * doesn't pop in from far below while already visible. Respects reduced motion.
 */
export function SpringReveal({
  children,
  className,
  rotate = 0,
  amount = 0.6,
  yFrom = 120,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  rotate?: number;
  amount?: number;
  yFrom?: number;
  delay?: number;
}) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  const cardVariants: Variants = {
    offscreen: { y: yFrom, opacity: 0 },
    onscreen: {
      y: 0,
      rotate,
      opacity: 1,
      transition: { type: "spring", bounce: 0.4, duration: 0.8, delay },
    },
  };

  return (
    <motion.div
      className={className}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount }}
    >
      <motion.div variants={cardVariants} style={{ transformOrigin: "50% 100%" }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
