import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FeaturedReel, type FeaturedReelProps } from "@/components/featured-reel";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) =>
      <div className={className} style={style}>{children}</div>,
  },
}));

const BASE: FeaturedReelProps = {
  kicker: "REEL 01",
  kickerArabic: "البكرة الأولى",
  title: "The Dark Knight",
  year: "2008",
  posterUrl: "https://example.com/poster.jpg",
  backdropUrl: "https://example.com/backdrop.jpg",
  overview: "Batman faces the Joker.",
  href: "/movies/the-dark-knight-2008",
  size: "lg",
};

describe("FeaturedReel", () => {
  it("renders the title", () => {
    render(<FeaturedReel {...BASE} />);
    expect(screen.getByText("The Dark Knight")).toBeInTheDocument();
  });

  it("renders the kicker text", () => {
    render(<FeaturedReel {...BASE} />);
    expect(screen.getByText("REEL 01")).toBeInTheDocument();
  });

  it("renders the Arabic kicker", () => {
    render(<FeaturedReel {...BASE} />);
    expect(screen.getByText("البكرة الأولى")).toBeInTheDocument();
  });

  it("renders the year", () => {
    render(<FeaturedReel {...BASE} />);
    expect(screen.getByText("2008")).toBeInTheDocument();
  });

  it("links to the correct href", () => {
    render(<FeaturedReel {...BASE} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/movies/the-dark-knight-2008");
  });

  it("renders overview for size lg", () => {
    render(<FeaturedReel {...BASE} size="lg" />);
    expect(screen.getByText("Batman faces the Joker.")).toBeInTheDocument();
  });

  it("does not render overview for size sm", () => {
    render(<FeaturedReel {...BASE} size="sm" />);
    expect(screen.queryByText("Batman faces the Joker.")).not.toBeInTheDocument();
  });

  it("renders em-dash when year is null", () => {
    render(<FeaturedReel {...BASE} year={null} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("renders backdrop image when backdropUrl provided", () => {
    render(<FeaturedReel {...BASE} />);
    const imgs = document.querySelectorAll("img");
    const backdrop = Array.from(imgs).find((img) => img.src.includes("backdrop"));
    expect(backdrop).toBeDefined();
  });

  it("renders without crashing when both posterUrl and backdropUrl are null", () => {
    expect(() =>
      render(<FeaturedReel {...BASE} posterUrl={null} backdropUrl={null} />)
    ).not.toThrow();
  });

  it("applies size md without throwing", () => {
    expect(() => render(<FeaturedReel {...BASE} size="md" />)).not.toThrow();
  });

  it("renders 'view reel' CTA text", () => {
    render(<FeaturedReel {...BASE} />);
    expect(screen.getByText("view reel")).toBeInTheDocument();
  });
});
