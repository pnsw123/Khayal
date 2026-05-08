import { describe, it, expect } from "vitest";
import { getUnlitHoverClasses } from "@/components/rate-widget";

describe("getUnlitHoverClasses — color tiers", () => {
  it("buttons 1–4 return red hover classes", () => {
    for (const n of [1, 2, 3, 4]) {
      const cls = getUnlitHoverClasses(n);
      expect(cls).toContain("hover:border-red-500/50");
      expect(cls).toContain("hover:text-red-400");
    }
  });

  it("buttons 5–7 return neutral saffron hover classes", () => {
    for (const n of [5, 6, 7]) {
      const cls = getUnlitHoverClasses(n);
      expect(cls).toContain("hover:border-[var(--saffron)]/50");
      expect(cls).toContain("hover:text-[var(--cream)]");
    }
  });

  it("buttons 8–10 return green hover classes", () => {
    for (const n of [8, 9, 10]) {
      const cls = getUnlitHoverClasses(n);
      expect(cls).toContain("hover:border-green-500/50");
      expect(cls).toContain("hover:text-green-400");
    }
  });

  it("button 1 has red hover class (boundary low)", () => {
    expect(getUnlitHoverClasses(1)).toContain("hover:border-red-500/50");
  });

  it("button 10 has green hover class (boundary high)", () => {
    expect(getUnlitHoverClasses(10)).toContain("hover:border-green-500/50");
  });

  it("button 4 is red and button 5 is neutral (tier boundary)", () => {
    expect(getUnlitHoverClasses(4)).toContain("hover:border-red-500/50");
    expect(getUnlitHoverClasses(5)).toContain("hover:border-[var(--saffron)]/50");
  });

  it("button 7 is neutral and button 8 is green (tier boundary)", () => {
    expect(getUnlitHoverClasses(7)).toContain("hover:border-[var(--saffron)]/50");
    expect(getUnlitHoverClasses(8)).toContain("hover:border-green-500/50");
  });
});
