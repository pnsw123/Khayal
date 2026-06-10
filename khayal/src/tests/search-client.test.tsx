import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "fs";
import { resolve } from "path";

// Source contract checks
const src = readFileSync(
  resolve(__dirname, "../app/search/search-client.tsx"),
  "utf-8"
);

// Mock heavy dependencies
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue(null) }),
}));

vi.mock("@/lib/search", () => ({
  searchAll: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/components/movie-card", () => ({
  MovieCard: ({ title }: { title: string }) => <div data-testid="movie-card">{title}</div>,
}));

vi.mock("@/components/empty-state", () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/lib/filters", () => ({
  YEARS: [
    { code: "", label: "All" },
    { code: "2020s", label: "2020s" },
  ],
}));

import { SearchClient } from "@/app/search/search-client";

describe("SearchClient source contract", () => {
  it("exports SearchClient", () => {
    expect(src).toContain("export function SearchClient");
  });

  it("has Find tab", () => {
    expect(src).toContain('"find"');
  });

  it("has SQL tab", () => {
    expect(src).toContain('"sql"');
  });

  it("uses search-input testid", () => {
    expect(src).toContain('data-testid="search-input"');
  });

  it("uses filter-type testid", () => {
    expect(src).toContain('testId="filter-type"');
  });

  it("uses search-results testid", () => {
    expect(src).toContain('data-testid="search-results"');
  });

  it("debounces search with 200ms timeout", () => {
    expect(src).toContain("200");
  });
});

describe("SearchClient render", () => {
  it("renders Find and SQL tab buttons", () => {
    render(<SearchClient defaultQueries={[]} />);
    expect(screen.getByRole("button", { name: /find/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sql/i })).toBeInTheDocument();
  });

  it("shows search input on Find tab by default", () => {
    render(<SearchClient defaultQueries={[]} />);
    expect(screen.getByTestId("search-input")).toBeInTheDocument();
  });

  it("switches to SQL tab on click", () => {
    render(<SearchClient defaultQueries={[]} />);
    fireEvent.click(screen.getByRole("button", { name: /sql/i }));
    expect(screen.getByRole("button", { name: /run/i })).toBeInTheDocument();
  });

  it("shows type filter chips on Find tab", () => {
    render(<SearchClient defaultQueries={[]} />);
    expect(screen.getByTestId("filter-type")).toBeInTheDocument();
  });
});
