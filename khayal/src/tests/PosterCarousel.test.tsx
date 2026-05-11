import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Mock embla-carousel-react — jsdom has no real scroll/layout engine
vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), null],
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} />
  ),
}));

import { PosterCarousel } from "@/components/PosterCarousel";

const ITEMS = [
  { slug: "movie-a", title: "Movie A", poster_url: "https://example.com/a.jpg", href: "/movies/movie-a" },
  { slug: "movie-b", title: "Movie B", poster_url: null, href: "/movies/movie-b" },
  { slug: "movie-c", title: "Movie C", poster_url: "https://example.com/c.jpg", href: "/movies/movie-c" },
];

describe("PosterCarousel", () => {
  it("renders the section title", () => {
    render(<PosterCarousel title="Top Picks" items={ITEMS} />);
    expect(screen.getByText("Top Picks")).toBeInTheDocument();
  });

  it("renders the correct number of slides", () => {
    render(<PosterCarousel title="Top Picks" items={ITEMS} />);
    const slides = screen.getAllByTestId("poster-slide");
    expect(slides).toHaveLength(ITEMS.length);
  });

  it("renders nothing when items array is empty", () => {
    const { container } = render(<PosterCarousel title="Empty" items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a poster image when poster_url is provided", () => {
    render(<PosterCarousel title="Top Picks" items={[ITEMS[0]]} />);
    const img = screen.getByRole("img", { name: "Movie A" });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("renders fallback text when poster_url is null", () => {
    render(<PosterCarousel title="Top Picks" items={[ITEMS[1]]} />);
    // The fallback renders the title as text inside the poster box
    const fallbacks = screen.getAllByText("Movie B");
    expect(fallbacks.length).toBeGreaterThan(0);
  });

  it("each slide links to the correct href", () => {
    render(<PosterCarousel title="Top Picks" items={ITEMS} />);
    const links = screen.getAllByTestId("poster-slide");
    expect(links[0]).toHaveAttribute("href", "/movies/movie-a");
    expect(links[1]).toHaveAttribute("href", "/movies/movie-b");
  });
});
