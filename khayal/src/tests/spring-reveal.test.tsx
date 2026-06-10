import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { render, screen } from "@testing-library/react";

// SpringReveal wraps children in motion variants. In jsdom we mock motion so the
// children render plainly; we assert structure via source + rendered children.

const src = readFileSync(
  resolve(__dirname, "../components/landing/spring-reveal.tsx"),
  "utf-8"
);

describe("SpringReveal source", () => {
  it("exports SpringReveal", () => {
    expect(src).toContain("export function SpringReveal");
  });

  it("ports the motion.dev card variants (offscreen/onscreen)", () => {
    expect(src).toContain("offscreen");
    expect(src).toContain("onscreen");
  });

  it("uses a spring transition with bounce 0.4 (the pronounced reveal)", () => {
    expect(src).toContain('type: "spring"');
    expect(src).toContain("bounce: 0.4");
  });

  it("drives the reveal on scroll-in via whileInView", () => {
    expect(src).toContain('whileInView="onscreen"');
    expect(src).toContain("viewport");
  });

  it("respects prefers-reduced-motion", () => {
    expect(src).toContain("prefersReduced");
  });
});

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className, style }: {
      children: React.ReactNode; className?: string; style?: React.CSSProperties;
    }) => <div className={className} style={style}>{children}</div>,
  },
  useReducedMotion: () => false,
}));

import { SpringReveal } from "@/components/landing/spring-reveal";

describe("SpringReveal render", () => {
  it("renders its children", () => {
    render(
      <SpringReveal>
        <span>card body</span>
      </SpringReveal>
    );
    expect(screen.getByText("card body")).toBeInTheDocument();
  });

  it("passes className through to the wrapper", () => {
    const { container } = render(
      <SpringReveal className="my-wrap">
        <span>x</span>
      </SpringReveal>
    );
    expect(container.querySelector(".my-wrap")).not.toBeNull();
  });
});
