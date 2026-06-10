import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shelf, type ShelfProps, type MovieWithGenres } from "@/components/shelf";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

// MovieCard has motion.js — stub it
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) =>
      <div style={style} className={className}>{children}</div>,
  },
  useMotionValue: () => ({ set: vi.fn() }),
  useSpring: (v: unknown) => v,
  useTransform: () => "0deg",
  useReducedMotion: () => false,
}));

const makeMovie = (id: number, title: string): MovieWithGenres => ({
  id,
  title,
  slug: `movie-${id}`,
  release_date: "2023-01-01",
  poster_url: null,
  backdrop_url: null,
  runtime_minutes: 120,
  age_rating: "PG",
  original_language: "en",
  country: "US",
  overview: null,
  tmdb_id: id,
  trailer_youtube_id: null,
  genre_names: ["Action"],
});

const BASE_PROPS: ShelfProps = {
  title: "Top Rated",
  items: [makeMovie(1, "Film One"), makeMovie(2, "Film Two")],
};

describe("Shelf", () => {
  it("renders the shelf title", () => {
    render(<Shelf {...BASE_PROPS} />);
    expect(screen.getByText("Top Rated")).toBeInTheDocument();
  });

  it("renders all movie titles", () => {
    render(<Shelf {...BASE_PROPS} />);
    // MovieCard renders title in both the img alt and h3 — use getAllByText
    expect(screen.getAllByText("Film One").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Film Two").length).toBeGreaterThan(0);
  });

  it("renders kicker when provided", () => {
    render(<Shelf {...BASE_PROPS} kicker="أفضل تقييمًا" />);
    expect(screen.getByText("أفضل تقييمًا")).toBeInTheDocument();
  });

  it("renders View all link when viewAllHref provided", () => {
    render(<Shelf {...BASE_PROPS} viewAllHref="/browse?sort=rated" />);
    expect(screen.getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/browse?sort=rated");
  });

  it("does not render View all when viewAllHref is not provided", () => {
    render(<Shelf {...BASE_PROPS} />);
    expect(screen.queryByRole("link", { name: /view all/i })).not.toBeInTheDocument();
  });

  it("renders nothing when items array is empty", () => {
    const { container } = render(<Shelf {...BASE_PROPS} items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders rating when ratingByMovie map contains the movie id", () => {
    const map = new Map([[1, 8.5]]);
    render(<Shelf {...BASE_PROPS} ratingByMovie={map} />);
    expect(screen.getByText("8.5")).toBeInTheDocument();
  });

  it("renders year derived from release_date", () => {
    render(<Shelf {...BASE_PROPS} />);
    // year() returns "2023" for "2023-01-01"
    expect(screen.getAllByText("2023").length).toBeGreaterThan(0);
  });
});
