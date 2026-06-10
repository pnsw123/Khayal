import * as motion from "motion/react-client";
import type { Variants } from "motion/react";

/**
 * ScrollReveal — scroll-triggered section reveal.
 *
 * Ports the motion.dev `whileInView` + spring pattern: each wrapped section
 * starts offscreen (faded + nudged down) and springs into place the first time
 * it enters the viewport. Applied to the below-the-fold landing sections so the
 * page unfolds as you scroll. `once: true` keeps it from re-firing on scroll-up.
 */
const sectionVariants: Variants = {
  offscreen: { y: 80, opacity: 0 },
  onscreen: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", bounce: 0.25, duration: 0.8 },
  },
};

export function ScrollReveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="offscreen"
      whileInView="onscreen"
      viewport={{ once: true, amount: 0.2 }}
      variants={sectionVariants}
    >
      {children}
    </motion.div>
  );
}
