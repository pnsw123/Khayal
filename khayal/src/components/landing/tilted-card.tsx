"use client";

// ReactBits TiltedCard — verbatim TypeScript port
// Source: https://github.com/DavidHDev/react-bits/blob/main/src/content/Components/TiltedCard/TiltedCard.jsx

import { useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const springValues = { damping: 30, stiffness: 100, mass: 2 };

interface TiltedCardProps {
  imageSrc: string;
  altText?: string;
  captionText?: string;
  containerHeight?: string;
  containerWidth?: string;
  imageHeight?: string;
  imageWidth?: string;
  scaleOnHover?: number;
  rotateAmplitude?: number;
  showTooltip?: boolean;
  overlayContent?: React.ReactNode;
  displayOverlayContent?: boolean;
}

export function TiltedCard({
  imageSrc,
  altText = "",
  captionText = "",
  containerHeight = "300px",
  containerWidth = "100%",
  imageHeight = "300px",
  imageWidth = "200px",
  scaleOnHover = 1.08,
  rotateAmplitude = 12,
  showTooltip = false,
  overlayContent = null,
  displayOverlayContent = false,
}: TiltedCardProps) {
  const ref = useRef<HTMLElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useMotionValue(0), springValues);
  const rotateY = useSpring(useMotionValue(0), springValues);
  const scale = useSpring(1, springValues);
  const opacity = useSpring(0);
  const rotateFigcaption = useSpring(0, { stiffness: 350, damping: 30, mass: 1 });

  const [lastY, setLastY] = useState(0);

  function handleMouse(e: React.MouseEvent) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const offsetX = e.clientX - rect.left - rect.width / 2;
    const offsetY = e.clientY - rect.top - rect.height / 2;
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude);
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude);
    x.set(e.clientX - rect.left);
    y.set(e.clientY - rect.top);
    const velocityY = offsetY - lastY;
    rotateFigcaption.set(-velocityY * 0.6);
    setLastY(offsetY);
  }

  function handleMouseEnter() {
    scale.set(scaleOnHover);
    opacity.set(1);
  }

  function handleMouseLeave() {
    opacity.set(0);
    scale.set(1);
    rotateX.set(0);
    rotateY.set(0);
    rotateFigcaption.set(0);
  }

  return (
    <figure
      ref={ref}
      style={{
        height: containerHeight,
        width: containerWidth,
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "800px",
        cursor: "pointer",
      }}
      onMouseMove={handleMouse}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <motion.div
        style={{
          width: imageWidth,
          height: imageHeight,
          rotateX,
          rotateY,
          scale,
          transformStyle: "preserve-3d",
          borderRadius: 8,
          overflow: "hidden",
          boxShadow: "0 20px 60px -10px rgba(0,0,0,0.6)",
        }}
      >
        <motion.img
          src={imageSrc}
          alt={altText}
          style={{ width: imageWidth, height: imageHeight, objectFit: "cover", display: "block" }}
        />
        {displayOverlayContent && overlayContent && (
          <motion.div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "flex-end",
              padding: "1rem",
            }}
          >
            {overlayContent}
          </motion.div>
        )}
      </motion.div>

      {showTooltip && captionText && (
        <motion.figcaption
          style={{
            x,
            y,
            opacity,
            rotate: rotateFigcaption,
            position: "absolute",
            pointerEvents: "none",
            background: "var(--ink)",
            color: "var(--cream)",
            fontSize: "0.75rem",
            padding: "4px 8px",
            borderRadius: 4,
            whiteSpace: "nowrap",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
          }}
        >
          {captionText}
        </motion.figcaption>
      )}
    </figure>
  );
}
