import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// Fake embla API — jsdom has no layout engine.
const api = {
  selectedScrollSnap: vi.fn(() => 0),
  on: vi.fn(),
  off: vi.fn(),
  scrollNext: vi.fn(),
  scrollPrev: vi.fn(),
  scrollTo: vi.fn(),
  canScrollPrev: vi.fn(() => true),
  canScrollNext: vi.fn(() => true),
};
vi.mock("embla-carousel-react", () => ({ default: () => [vi.fn(), api] }));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

const reduced = vi.fn(() => false);
vi.mock("motion/react", () => ({ useReducedMotion: () => reduced() }));

import { HeroCarousel, HERO_INTERVAL } from "@/components/landing/hero-carousel";
import type { LandingFeatured } from "@/lib/landing";

const SLIDES: LandingFeatured[] = [
  { id: 1, title: "Dune", slug: "dune-2021", year: "2021", overview: "Spice.", runtime: 155, ageRating: "PG-13", backdropUrl: "https://image.tmdb.org/b1.jpg" },
  { id: 2, title: "Arrival", slug: "arrival-2016", year: "2016", overview: null, runtime: null, ageRating: null, backdropUrl: "https://image.tmdb.org/b2.jpg" },
];

describe("HeroCarousel", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); reduced.mockReturnValue(false); });
  afterEach(() => { vi.useRealTimers(); });

  it("renders nothing without slides", () => {
    const { container } = render(<HeroCarousel slides={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders each slide's title, year chip and a details link (no play/watch)", () => {
    render(<HeroCarousel slides={SLIDES} />);
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByText("Arrival")).toBeInTheDocument();
    expect(screen.getByText("2021")).toBeInTheDocument();
    const details = screen.getAllByRole("link", { name: /view details/i });
    expect(details[0]).toHaveAttribute("href", "/movies/dune-2021");
    expect(screen.queryByText(/play|watch now/i)).not.toBeInTheDocument();
  });

  it("dots jump to their slide", () => {
    render(<HeroCarousel slides={SLIDES} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Arrival" }));
    expect(api.scrollTo).toHaveBeenCalledWith(1);
  });

  it("auto-advances after HERO_INTERVAL", () => {
    render(<HeroCarousel slides={SLIDES} />);
    act(() => { vi.advanceTimersByTime(HERO_INTERVAL - 1); });
    expect(api.scrollNext).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(api.scrollNext).toHaveBeenCalledTimes(1);
  });

  it("does not auto-advance when the user prefers reduced motion", () => {
    reduced.mockReturnValue(true);
    render(<HeroCarousel slides={SLIDES} />);
    act(() => { vi.advanceTimersByTime(HERO_INTERVAL * 3); });
    expect(api.scrollNext).not.toHaveBeenCalled();
  });
});
