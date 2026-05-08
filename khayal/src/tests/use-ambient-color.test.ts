import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useAmbientColor, processColor } from "@/hooks/use-ambient-color";

vi.mock("colorthief", () => ({
  getColor: vi.fn().mockResolvedValue([20, 50, 80]),
}));

describe("useAmbientColor", () => {
  it("returns null when posterUrl is null", () => {
    const { result } = renderHook(() => useAmbientColor(null));
    expect(result.current).toBeNull();
  });

  it("returns null when posterUrl is empty string", () => {
    const { result } = renderHook(() => useAmbientColor(""));
    expect(result.current).toBeNull();
  });
});

describe("processColor", () => {
  it("returns an object with r, g, b keys", () => {
    const color = processColor([20, 50, 80]);
    expect(color).toHaveProperty("r");
    expect(color).toHaveProperty("g");
    expect(color).toHaveProperty("b");
  });

  it("r, g, b values are all in range 0-255", () => {
    const color = processColor([100, 150, 200]);
    expect(color.r).toBeGreaterThanOrEqual(0);
    expect(color.r).toBeLessThanOrEqual(255);
    expect(color.g).toBeGreaterThanOrEqual(0);
    expect(color.g).toBeLessThanOrEqual(255);
    expect(color.b).toBeGreaterThanOrEqual(0);
    expect(color.b).toBeLessThanOrEqual(255);
  });

  it("darkens the color when luminance exceeds 0.4", () => {
    const color = processColor([220, 220, 220]);
    expect(color.r).toBeLessThan(220);
    expect(color.g).toBeLessThan(220);
    expect(color.b).toBeLessThan(220);
  });
});
