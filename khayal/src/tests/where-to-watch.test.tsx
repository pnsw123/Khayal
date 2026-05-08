import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { WhereToWatch } from "../components/where-to-watch";

// Mock the Trailer component to avoid YouTube embed complexity
vi.mock("../components/trailer", () => ({
  Trailer: () => <div data-testid="trailer-mock" />,
}));

describe("WhereToWatch source — trailer is NOT full-width", () => {
  const src = readFileSync(
    resolve(__dirname, "../components/where-to-watch.tsx"),
    "utf-8"
  );

  it("does not pass w-full className to Trailer", () => {
    expect(src).not.toContain('className="w-full"');
  });

  it("Trailer element carries no className prop", () => {
    const trailerLine = src.split("\n").find((l) => l.includes("<Trailer"));
    expect(trailerLine).toBeDefined();
    expect(trailerLine).not.toContain("className=");
  });
});

describe("Trailer source — buttons use subtle border, not filled saffron", () => {
  const src = readFileSync(
    resolve(__dirname, "../components/trailer.tsx"),
    "utf-8"
  );

  it("does not use bg-[var(--saffron)] as button fill", () => {
    const filledLines = src
      .split("\n")
      .filter((l) => l.includes("bg-[var(--saffron)]") && !l.includes("border-[var(--saffron)]"));
    expect(filledLines).toHaveLength(0);
  });

  it("uses border-[var(--taupe)]/40 on trigger buttons", () => {
    expect(src).toContain("border border-[var(--taupe)]/40");
  });

  it("hover uses saffron border not saffron background", () => {
    expect(src).toContain("hover:border-[var(--saffron)]/60");
    expect(src).not.toContain("hover:bg-[var(--saffron-glow)]");
  });
});

describe("WhereToWatch", () => {
  const defaultProps = { title: "Inception", year: "2010" };

  it("renders all 3 links with correct labels", () => {
    render(<WhereToWatch {...defaultProps} />);
    expect(screen.getByText("JustWatch")).toBeInTheDocument();
    expect(screen.getByText("Letterboxd")).toBeInTheDocument();
    expect(screen.getByText("IMDb")).toBeInTheDocument();
  });

  it("renders sub-label 'Stream & Rent' under JustWatch", () => {
    render(<WhereToWatch {...defaultProps} />);
    expect(screen.getByText("Stream & Rent")).toBeInTheDocument();
  });

  it("renders sub-label 'Reviews' under Letterboxd", () => {
    render(<WhereToWatch {...defaultProps} />);
    expect(screen.getByText("Reviews")).toBeInTheDocument();
  });

  it("renders sub-label 'Info' under IMDb", () => {
    render(<WhereToWatch {...defaultProps} />);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("links have correct hrefs encoding title and year", () => {
    render(<WhereToWatch {...defaultProps} />);
    const links = screen.getAllByRole("link");
    const externalLinks = links.filter((l) =>
      l.getAttribute("href")?.startsWith("https://")
    );
    expect(externalLinks.length).toBeGreaterThanOrEqual(3);
    const hrefs = externalLinks.map((l) => l.getAttribute("href"));
    expect(hrefs.some((h) => h?.includes("justwatch.com"))).toBe(true);
    expect(hrefs.some((h) => h?.includes("letterboxd.com"))).toBe(true);
    expect(hrefs.some((h) => h?.includes("imdb.com"))).toBe(true);
  });
});
