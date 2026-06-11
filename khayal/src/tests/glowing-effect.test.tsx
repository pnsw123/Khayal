import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { GlowingEffect } from "@/components/ui/glowing-effect";

vi.mock("motion/react", () => ({
  animate: vi.fn(),
}));

describe("GlowingEffect", () => {
  it("hides glow container when disabled (default)", () => {
    const { container } = render(<GlowingEffect />);
    // When disabled, the outer glow div has class !hidden (display:none)
    const glowOuter = container.querySelectorAll("div")[1];
    expect(glowOuter?.className).toContain("hidden");
  });

  it("renders glow div when not disabled", () => {
    const { container } = render(<GlowingEffect disabled={false} />);
    const glow = container.querySelector(".glow");
    expect(glow).toBeInTheDocument();
  });

  it("applies custom className to glow container", () => {
    const { container } = render(
      <GlowingEffect disabled={false} className="test-glow" />
    );
    const glowContainer = container.querySelector(".test-glow");
    expect(glowContainer).toBeInTheDocument();
  });

  it("applies blur class when blur > 0", () => {
    const { container } = render(<GlowingEffect disabled={false} blur={10} />);
    const glowDiv = container.querySelector("[class*='blur']");
    expect(glowDiv).toBeInTheDocument();
  });

  it("sets CSS vars on glow container", () => {
    const { container } = render(
      <GlowingEffect disabled={false} spread={50} borderWidth={2} />
    );
    const divs = container.querySelectorAll("div");
    const styled = Array.from(divs).find(
      (d) => d.style.getPropertyValue("--spread") !== ""
    );
    expect(styled).toBeTruthy();
    expect(styled?.style.getPropertyValue("--spread")).toBe("50");
  });
});
