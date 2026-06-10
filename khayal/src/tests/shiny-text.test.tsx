import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { render, screen } from "@testing-library/react";

const src = readFileSync(
  resolve(__dirname, "../components/landing/shiny-text.tsx"),
  "utf-8"
);

describe("ShinyText source", () => {
  it("default exports ShinyText", () => {
    expect(src).toContain("export default ShinyText");
  });

  it("defaults to brand CSS-var colors (cream over cream-muted)", () => {
    expect(src).toContain('color = "var(--cream-muted)"');
    expect(src).toContain('shineColor = "var(--cream)"');
  });

  it("uses background-clip text gradient sweep (verbatim ReactBits)", () => {
    expect(src).toContain("WebkitBackgroundClip");
    expect(src).toContain("backgroundPosition");
  });

  it("supports a disabled prop for reduced motion", () => {
    expect(src).toContain("disabled");
  });
});

vi.mock("motion/react", () => ({
  motion: {
    span: ({ children, className, style }: {
      children: React.ReactNode; className?: string; style?: React.CSSProperties;
    }) => <span className={className} style={style}>{children}</span>,
  },
  useMotionValue: (v: number) => ({ set: vi.fn(), get: () => v }),
  useAnimationFrame: () => {},
  useTransform: () => "150% center",
}));

import ShinyText from "@/components/landing/shiny-text";

describe("ShinyText render", () => {
  it("renders the provided text", () => {
    render(<ShinyText text="KHAYAL CINEMA DATABASE" />);
    expect(screen.getByText("KHAYAL CINEMA DATABASE")).toBeInTheDocument();
  });

  it("applies the passed className", () => {
    render(<ShinyText text="hi" className="font-mono" />);
    expect(screen.getByText("hi")).toHaveClass("font-mono");
  });
});
