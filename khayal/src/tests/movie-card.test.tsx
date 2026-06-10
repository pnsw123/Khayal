import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MovieCard } from "@/components/movie-card";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, className, onMouseMove, onMouseLeave }: {
    href: string; children: React.ReactNode; className?: string;
    onMouseMove?: React.MouseEventHandler; onMouseLeave?: React.MouseEventHandler;
  }) => (
    <a href={href} className={className} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>{children}</a>
  ),
}));

// Mock motion/react — jsdom does not support full animation engine
vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) =>
      <div style={style} className={className}>{children}</div>,
  },
  useMotionValue: () => ({ set: vi.fn() }),
  useSpring: (mv: unknown) => mv,
  useTransform: () => "0deg",
  useReducedMotion: () => false,
}));

const BASE_PROPS = {
  title: "Inception",
  year: "2010",
  posterUrl: "https://example.com/poster.jpg",
  href: "/movies/inception-2010",
};

describe("MovieCard", () => {
  it("renders movie title", () => {
    render(<MovieCard {...BASE_PROPS} />);
    expect(screen.getByText("Inception")).toBeInTheDocument();
  });

  it("renders the year", () => {
    render(<MovieCard {...BASE_PROPS} />);
    expect(screen.getByText("2010")).toBeInTheDocument();
  });

  it("renders a link to the movie href", () => {
    render(<MovieCard {...BASE_PROPS} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/movies/inception-2010");
  });

  it("renders poster image when posterUrl provided", () => {
    render(<MovieCard {...BASE_PROPS} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/poster.jpg");
    expect(img).toHaveAttribute("alt", "Inception");
  });

  it("renders fallback placeholder when no posterUrl", () => {
    render(<MovieCard {...BASE_PROPS} posterUrl={null} />);
    // Fallback shows Arabic text خيال
    expect(screen.getByText("خيال")).toBeInTheDocument();
  });

  it("renders rating pill when rating is provided", () => {
    render(<MovieCard {...BASE_PROPS} rating={8.5} />);
    expect(screen.getByText("8.5")).toBeInTheDocument();
  });

  it("does not render rating pill when rating is zero", () => {
    render(<MovieCard {...BASE_PROPS} rating={0} />);
    // "0.0" should not appear as a rating pill
    expect(screen.queryByText("0.0")).not.toBeInTheDocument();
  });

  it("renders age rating badge when ageRating provided", () => {
    render(<MovieCard {...BASE_PROPS} ageRating="PG-13" />);
    expect(screen.getByText("PG-13")).toBeInTheDocument();
  });

  it("renders first genre when provided", () => {
    render(<MovieCard {...BASE_PROPS} genres={["Action", "Drama"]} />);
    expect(screen.getByText(/Action/)).toBeInTheDocument();
  });

  it("does not crash when genres is null", () => {
    expect(() => render(<MovieCard {...BASE_PROPS} genres={null} />)).not.toThrow();
  });

  it("does not crash when year is null", () => {
    expect(() => render(<MovieCard {...BASE_PROPS} year={null} />)).not.toThrow();
  });

  it("accepts className prop", () => {
    const { container } = render(<MovieCard {...BASE_PROPS} className="custom-class" />);
    expect(container.querySelector(".custom-class")).not.toBeNull();
  });
});
