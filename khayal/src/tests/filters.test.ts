import { describe, it, expect } from "vitest";
import {
  buildFilterHref,
  hasAnyFilter,
  LANGUAGES,
  RATINGS,
  YEARS,
  SCORES,
  SORT_OPTIONS,
} from "@/lib/filters";

describe("buildFilterHref", () => {
  it("adds a new param", () => {
    const sp = new URLSearchParams();
    expect(buildFilterHref(sp, "lang", "fr")).toBe("/browse?lang=fr");
  });

  it("replaces existing param", () => {
    const sp = new URLSearchParams("lang=en");
    expect(buildFilterHref(sp, "lang", "fr")).toBe("/browse?lang=fr");
  });

  it("removes param when value is empty string", () => {
    const sp = new URLSearchParams("lang=en");
    expect(buildFilterHref(sp, "lang", "")).toBe("/browse");
  });

  it("preserves other params", () => {
    const sp = new URLSearchParams("year=2020s");
    const href = buildFilterHref(sp, "lang", "ja");
    expect(href).toContain("year=2020s");
    expect(href).toContain("lang=ja");
  });

  it("uses custom basePath", () => {
    const sp = new URLSearchParams();
    expect(buildFilterHref(sp, "lang", "en", "/films")).toBe("/films?lang=en");
  });

  it("returns bare basePath when no params remain", () => {
    const sp = new URLSearchParams();
    expect(buildFilterHref(sp, "lang", "")).toBe("/browse");
  });

  it("does not duplicate page key", () => {
    const sp = new URLSearchParams("page=3&lang=en");
    const href = buildFilterHref(sp, "lang", "fr");
    // Exactly one lang param
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.getAll("lang")).toHaveLength(1);
    expect(params.get("lang")).toBe("fr");
  });
});

describe("hasAnyFilter", () => {
  it("returns false for empty params", () => {
    expect(hasAnyFilter(new URLSearchParams())).toBe(false);
  });

  it("returns true when lang is set", () => {
    expect(hasAnyFilter(new URLSearchParams("lang=fr"))).toBe(true);
  });

  it("returns true when rating is set", () => {
    expect(hasAnyFilter(new URLSearchParams("rating=PG"))).toBe(true);
  });

  it("returns true when year is set", () => {
    expect(hasAnyFilter(new URLSearchParams("year=2010s"))).toBe(true);
  });

  it("returns true when score is set", () => {
    expect(hasAnyFilter(new URLSearchParams("score=8"))).toBe(true);
  });

  it("returns true when sort is set", () => {
    expect(hasAnyFilter(new URLSearchParams("sort=popular"))).toBe(true);
  });

  it("returns true when q is set", () => {
    expect(hasAnyFilter(new URLSearchParams("q=batman"))).toBe(true);
  });

  it("returns false when only page is set", () => {
    expect(hasAnyFilter(new URLSearchParams("page=2"))).toBe(false);
  });
});

describe("LANGUAGES constant", () => {
  it("first item has empty code (All)", () => {
    expect(LANGUAGES[0].code).toBe("");
    expect(LANGUAGES[0].label).toBe("All");
  });

  it("contains English", () => {
    expect(LANGUAGES.find((l) => l.code === "en")?.label).toBe("English");
  });

  it("contains Japanese", () => {
    expect(LANGUAGES.find((l) => l.code === "ja")?.label).toBe("Japanese");
  });
});

describe("RATINGS constant", () => {
  it("first item is All Ratings", () => {
    expect(RATINGS[0].code).toBe("");
    expect(RATINGS[0].label).toBe("All Ratings");
  });

  it("contains PG-13", () => {
    expect(RATINGS.find((r) => r.code === "PG-13")).toBeDefined();
  });
});

describe("YEARS constant", () => {
  it("first item is All Years", () => {
    expect(YEARS[0].code).toBe("");
    expect(YEARS[0].label).toBe("All Years");
  });

  it("contains 2020s", () => {
    expect(YEARS.find((y) => y.code === "2020s")?.label).toBe("2020s");
  });

  it("contains older", () => {
    expect(YEARS.find((y) => y.code === "older")).toBeDefined();
  });
});

describe("SCORES constant", () => {
  it("first item is Any Score", () => {
    expect(SCORES[0].code).toBe("");
  });

  it("has score code 9 for masterpiece", () => {
    expect(SCORES.find((s) => s.code === "9")).toBeDefined();
  });
});

describe("SORT_OPTIONS constant", () => {
  it("first item is Latest First (empty code)", () => {
    expect(SORT_OPTIONS[0].code).toBe("");
    expect(SORT_OPTIONS[0].label).toBe("Latest First");
  });

  it("contains popular sort", () => {
    expect(SORT_OPTIONS.find((s) => s.code === "popular")).toBeDefined();
  });
});
