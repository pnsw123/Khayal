import { describe, it, expect } from "vitest";
import { cn, year, runtime } from "@/lib/utils";

describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const cond = false;
    expect(cn("base", cond && "nope", "ok")).toBe("base ok");
  });

  it("deduplicates tailwind classes (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("handles undefined/null without throwing", () => {
    expect(() => cn(undefined, null as never, "x")).not.toThrow();
  });

  it("returns empty string for no args", () => {
    expect(cn()).toBe("");
  });
});

describe("year", () => {
  it("extracts year from ISO date", () => {
    expect(year("2023-07-14")).toBe("2023");
  });

  it("returns em-dash for null", () => {
    expect(year(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(year(undefined)).toBe("—");
  });

  it("returns em-dash for empty string", () => {
    expect(year("")).toBe("—");
  });

  it("extracts year even without month/day", () => {
    expect(year("1999-01-01")).toBe("1999");
  });
});

describe("runtime", () => {
  it("formats hours and minutes", () => {
    expect(runtime(107)).toBe("1h 47m");
  });

  it("formats hours only when no minutes", () => {
    expect(runtime(120)).toBe("2h");
  });

  it("formats minutes only when under an hour", () => {
    expect(runtime(45)).toBe("45m");
  });

  it("returns em-dash for null", () => {
    expect(runtime(null)).toBe("—");
  });

  it("returns em-dash for undefined", () => {
    expect(runtime(undefined)).toBe("—");
  });

  it("returns em-dash for zero", () => {
    expect(runtime(0)).toBe("—");
  });

  it("handles exact 60 minutes as 1h", () => {
    expect(runtime(60)).toBe("1h");
  });

  it("handles 90 minutes as 1h 30m", () => {
    expect(runtime(90)).toBe("1h 30m");
  });
});
