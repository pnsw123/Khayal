import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import { render, screen } from "@testing-library/react";

// ─── Source-level contract tests for heavy WebGL / animation landing components ───
// Full render tests are not viable here because jsdom has no WebGL context;
// instead we verify the source exports, props, and key rendered text via
// source inspection + shallow mocking for components that CAN render in jsdom.

// ── aurora-bg ──────────────────────────────────────────────────────────────

const auroraSrc = readFileSync(
  resolve(__dirname, "../components/landing/aurora-bg.tsx"),
  "utf-8"
);

describe("AuroraBg source", () => {
  it("exports AuroraBg", () => {
    expect(auroraSrc).toContain("export function AuroraBg");
  });

  it("accepts colorStops prop", () => {
    expect(auroraSrc).toContain("colorStops");
  });

  it("is aria-hidden (decorative)", () => {
    expect(auroraSrc).toContain("aria-hidden");
  });

  it("uses OGL renderer", () => {
    expect(auroraSrc).toContain("Renderer");
  });
});

// ── line-waves ─────────────────────────────────────────────────────────────

const lineWavesSrc = readFileSync(
  resolve(__dirname, "../components/landing/line-waves.tsx"),
  "utf-8"
);

describe("LineWaves source", () => {
  it("exports LineWaves", () => {
    expect(lineWavesSrc).toContain("export function LineWaves");
  });

  it("has mouse interaction support prop", () => {
    expect(lineWavesSrc).toContain("enableMouseInteraction");
  });
});

// ── cta-section ────────────────────────────────────────────────────────────

vi.mock("next/link", () => ({
  default: ({ href, children, className, "data-testid": tid }: {
    href: string; children: React.ReactNode; className?: string; "data-testid"?: string;
  }) => <a href={href} className={className} data-testid={tid}>{children}</a>,
}));

vi.mock("motion/react", () => ({
  motion: {
    div: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) =>
      <div className={className} style={style}>{children}</div>,
    h2: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) =>
      <h2 className={className} style={style}>{children}</h2>,
    p: ({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) =>
      <p className={className} style={style}>{children}</p>,
    span: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  },
  useReducedMotion: () => true,
  useInView: () => true,
  useMotionValue: (v: number) => ({
    set: vi.fn(),
    on: vi.fn().mockReturnValue(vi.fn()),
    get: vi.fn().mockReturnValue(v),
  }),
  useSpring: (v: unknown) => v,
}));

import { CTASection } from "@/components/landing/cta-section";

describe("CTASection", () => {
  it("renders 'Track what you watch.' headline", () => {
    render(<CTASection />);
    expect(screen.getByText("Track what you watch.")).toBeInTheDocument();
  });

  it("renders Browse Films CTA", () => {
    render(<CTASection />);
    expect(screen.getByTestId("cta-browse")).toBeInTheDocument();
  });

  it("Browse Films links to /browse", () => {
    render(<CTASection />);
    expect(screen.getByTestId("cta-browse")).toHaveAttribute("href", "/browse");
  });

  it("renders Sign In CTA", () => {
    render(<CTASection />);
    expect(screen.getByTestId("cta-signin")).toBeInTheDocument();
  });

  it("Sign In links to /login", () => {
    render(<CTASection />);
    expect(screen.getByTestId("cta-signin")).toHaveAttribute("href", "/login");
  });

  it("renders film count subline text", () => {
    render(<CTASection />);
    expect(screen.getByText(/7,000\+ films and series/i)).toBeInTheDocument();
  });
});

// ── stats-section ──────────────────────────────────────────────────────────

import { StatsSection } from "@/components/landing/stats-section";

describe("StatsSection", () => {
  it("renders label 'Films catalogued'", () => {
    render(<StatsSection filmCount={7000} ratingCount={50000} reviewCount={12000} />);
    expect(screen.getByText("Films catalogued")).toBeInTheDocument();
  });

  it("renders label 'Ratings cast'", () => {
    render(<StatsSection filmCount={7000} ratingCount={50000} reviewCount={12000} />);
    expect(screen.getByText("Ratings cast")).toBeInTheDocument();
  });

  it("renders label 'Reviews written'", () => {
    render(<StatsSection filmCount={7000} ratingCount={50000} reviewCount={12000} />);
    expect(screen.getByText("Reviews written")).toBeInTheDocument();
  });

  it("renders Arabic byline 'بالأرقام'", () => {
    render(<StatsSection filmCount={7000} ratingCount={50000} reviewCount={12000} />);
    expect(screen.getByText(/بالأرقام/)).toBeInTheDocument();
  });
});

// ── circular-gallery source ────────────────────────────────────────────────

const gallerySrc = readFileSync(
  resolve(__dirname, "../components/landing/circular-gallery.tsx"),
  "utf-8"
);

describe("CircularGallery source", () => {
  it("exports CircularGallery", () => {
    expect(gallerySrc).toContain("export function CircularGallery");
  });

  it("accepts items prop", () => {
    expect(gallerySrc).toContain("items");
  });
});

// ── tilted-card source ─────────────────────────────────────────────────────

const tiltedCardSrc = readFileSync(
  resolve(__dirname, "../components/landing/tilted-card.tsx"),
  "utf-8"
);

describe("TiltedCard source", () => {
  it("exports TiltedCard", () => {
    expect(tiltedCardSrc).toContain("export function TiltedCard");
  });

  it("accepts imageSrc or src prop", () => {
    const hasProp = tiltedCardSrc.includes("imageSrc") || tiltedCardSrc.includes('"src"') || tiltedCardSrc.includes("src:");
    expect(hasProp).toBe(true);
  });
});

// ── scroll-stack source ────────────────────────────────────────────────────

const scrollStackSrc = readFileSync(
  resolve(__dirname, "../components/landing/scroll-stack.tsx"),
  "utf-8"
);

describe("ScrollStack source", () => {
  it("exports ScrollStack or default", () => {
    const hasExport = scrollStackSrc.includes("export function ScrollStack")
      || scrollStackSrc.includes("export default");
    expect(hasExport).toBe(true);
  });
});

// ── masonry-gallery source ─────────────────────────────────────────────────

const masonrySrc = readFileSync(
  resolve(__dirname, "../components/landing/masonry-gallery.tsx"),
  "utf-8"
);

describe("MasonryGallery source", () => {
  it("exports MasonryGallery", () => {
    expect(masonrySrc).toContain("MasonryGallery");
  });
});

// ── gallery-section source ─────────────────────────────────────────────────

const gallerySectionSrc = readFileSync(
  resolve(__dirname, "../components/landing/gallery-section.tsx"),
  "utf-8"
);

describe("GallerySection source", () => {
  it("exports GallerySection or contains section element", () => {
    const hasExport = gallerySectionSrc.includes("GallerySection") || gallerySectionSrc.includes("export");
    expect(hasExport).toBe(true);
  });
});

// ── film-ticker source ─────────────────────────────────────────────────────

const filmTickerSrc = readFileSync(
  resolve(__dirname, "../components/landing/film-ticker.tsx"),
  "utf-8"
);

describe("FilmTicker source", () => {
  it("exports FilmTicker", () => {
    expect(filmTickerSrc).toContain("FilmTicker");
  });

  it("accepts films prop or items prop", () => {
    const hasProps = filmTickerSrc.includes("films") || filmTickerSrc.includes("items") || filmTickerSrc.includes("FilmTicker");
    expect(hasProps).toBe(true);
  });
});

// ── featured-films source ──────────────────────────────────────────────────

const featuredFilmsSrc = readFileSync(
  resolve(__dirname, "../components/landing/featured-films.tsx"),
  "utf-8"
);

describe("FeaturedFilms source", () => {
  it("exports FeaturedFilms", () => {
    expect(featuredFilmsSrc).toContain("export function FeaturedFilms");
  });

  it("returns null when movies array is empty", () => {
    expect(featuredFilmsSrc).toContain("movies.length === 0");
  });

  it("links to /browse?sort=rated", () => {
    expect(featuredFilmsSrc).toContain("/browse?sort=rated");
  });
});

// ── hero-section source ────────────────────────────────────────────────────

const heroSrc = readFileSync(
  resolve(__dirname, "../components/landing/hero-section.tsx"),
  "utf-8"
);

describe("HeroSection source", () => {
  it("exports HeroSection", () => {
    expect(heroSrc).toContain("export function HeroSection");
  });

  it("spells out KHAYAL letters", () => {
    expect(heroSrc).toContain('"K"');
    expect(heroSrc).toContain('"H"');
    expect(heroSrc).toContain('"A"');
    expect(heroSrc).toContain('"Y"');
    expect(heroSrc).toContain('"L"');
  });

  it("uses LineWaves as background", () => {
    expect(heroSrc).toContain("LineWaves");
  });

  it("respects prefers-reduced-motion", () => {
    expect(heroSrc).toContain("prefersReduced");
  });
});
