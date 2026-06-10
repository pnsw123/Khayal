import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

const { mockUseAmbientColor } = vi.hoisted(() => {
  const mockUseAmbientColor = vi.fn();
  return { mockUseAmbientColor };
});

vi.mock("@/lib/use-ambient-color", () => ({
  useAmbientColor: mockUseAmbientColor,
}));

import { AmbientBackdrop } from "@/components/ambient-backdrop";

describe("AmbientBackdrop", () => {
  it("renders nothing when posterUrl is null", () => {
    mockUseAmbientColor.mockReturnValue(null);
    const { container } = render(<AmbientBackdrop posterUrl={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a div when posterUrl is provided and color resolves", () => {
    mockUseAmbientColor.mockReturnValue({ r: 30, g: 60, b: 120 });
    const { container } = render(<AmbientBackdrop posterUrl="https://example.com/poster.jpg" />);
    expect(container.firstChild).not.toBeNull();
    expect(container.querySelector("div")).toBeInTheDocument();
  });

  it("the rendered div has position absolute styling", () => {
    mockUseAmbientColor.mockReturnValue({ r: 30, g: 60, b: 120 });
    const { container } = render(<AmbientBackdrop posterUrl="https://example.com/poster.jpg" />);
    const div = container.querySelector("div");
    expect(div).not.toBeNull();
    const style = div!.getAttribute("style") ?? "";
    const classList = div!.className;
    expect(classList.includes("absolute") || style.includes("position: absolute")).toBe(true);
  });

  it("has transition CSS property set", () => {
    mockUseAmbientColor.mockReturnValue({ r: 30, g: 60, b: 120 });
    const { container } = render(<AmbientBackdrop posterUrl="https://example.com/poster.jpg" />);
    const div = container.querySelector("div");
    expect(div).not.toBeNull();
    const style = div!.getAttribute("style") ?? "";
    const classList = div!.className;
    expect(style.includes("transition") || classList.includes("transition")).toBe(true);
  });
});
