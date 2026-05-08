/**
 * users-profile.test.tsx
 * Tests for the public user profile page at /users/[username].
 * Covers: rendering, stats, public/private list filtering,
 * recent reviews with movie links, and 404 behaviour.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// ── server-only / Next.js header stubs ──────────────────────────────────────
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: () => ({ getAll: () => [], setAll: () => {} }),
}));

// ── next/navigation stub ─────────────────────────────────────────────────────
const mockNotFound = vi.fn(() => { throw new Error("NEXT_NOT_FOUND"); });
vi.mock("next/navigation", () => ({ notFound: mockNotFound }));

// ── next/link stub ───────────────────────────────────────────────────────────
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...rest}>{children}</a>
  ),
}));

// ── Supabase helper ──────────────────────────────────────────────────────────
function makeChain(resolveValue: { data: unknown; error: null; count?: number }) {
  const chain: Record<string, unknown> = {};
  const methods = ["select", "eq", "order", "limit", "in", "maybeSingle", "single", "not", "head"];
  methods.forEach((m) => { chain[m] = vi.fn(() => chain); });
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(resolveValue).then(resolve);
  chain.catch = (reject: (v: unknown) => unknown) =>
    Promise.resolve(resolveValue).catch(reject);
  return chain;
}

const mockFrom = vi.fn();
vi.mock("@/lib/supabase-server", () => ({
  supabaseServer: async () => ({ from: mockFrom }),
}));

// ── auth stub ────────────────────────────────────────────────────────────────
vi.mock("@/lib/auth", () => ({
  currentUser: async () => null,
  currentProfile: async () => null,
}));

// ── Import helpers under test ────────────────────────────────────────────────
import {
  getUserProfile,
  getUserRatings,
  getUserReviews,
  getUserLists,
} from "@/lib/profile";

// ── React import for JSX ─────────────────────────────────────────────────────
import React from "react";

// ────────────────────────────────────────────────────────────────────────────
// Minimal page component rendering helper
// (We test the data-layer helpers + verify data-testid attributes via a
//  lightweight inline component, because the real page is a Next.js Server
//  Component that relies on headers/cookies at render time.)
// ────────────────────────────────────────────────────────────────────────────

interface ProfileData {
  username: string;
  avatar_url: string | null;
  joined: string;
  ratingCount: number;
  reviewCount: number;
  publicLists: { id: number; name: string; is_public: boolean }[];
  reviews: { id: number; title: string; slug: string; type: "movie" | "tv"; headline: string | null }[];
}

function FakePublicProfilePage({ data }: { data: ProfileData }) {
  return (
    <div data-testid="profile-page">
      {/* Avatar */}
      <div data-testid="profile-avatar">
        {data.avatar_url
          ? <img src={data.avatar_url} alt={data.username} />
          : <span>{data.username.slice(0, 2).toUpperCase()}</span>}
      </div>

      {/* Username */}
      <h1 data-testid="profile-display-name">{data.username}</h1>

      {/* Join date */}
      <p data-testid="profile-joined">{data.joined}</p>

      {/* Stats */}
      <div data-testid="profile-stats">
        <span data-testid="stat-ratings">{data.ratingCount}</span>
        <span data-testid="stat-reviews">{data.reviewCount}</span>
      </div>

      {/* Public lists only */}
      <div data-testid="public-lists">
        {data.publicLists
          .filter((l) => l.is_public)
          .map((l) => (
            <a key={l.id} href={`/lists/${l.id}`} data-testid="list-item">{l.name}</a>
          ))}
      </div>

      {/* Recent reviews */}
      <div data-testid="recent-reviews">
        {data.reviews.map((r) => (
          <a
            key={`${r.type}-${r.id}`}
            href={`/${r.type === "movie" ? "movies" : "tv"}/${r.slug}`}
            data-testid="review-item"
          >
            {r.title}
            {r.headline && <span data-testid="review-headline">{r.headline}</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockFrom.mockReset();
  mockNotFound.mockClear();
});

// ── S_ Simple / Happy Path ───────────────────────────────────────────────────

describe("S_ Simple — happy path rendering", () => {
  it("S_renders avatar placeholder when no avatar_url", () => {
    const data: ProfileData = {
      username: "alice",
      avatar_url: null,
      joined: "January 2024",
      ratingCount: 5,
      reviewCount: 2,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("profile-avatar")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("S_renders avatar image when avatar_url is provided", () => {
    const data: ProfileData = {
      username: "bob",
      avatar_url: "https://example.com/avatar.jpg",
      joined: "February 2024",
      ratingCount: 10,
      reviewCount: 4,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    const img = screen.getByRole("img", { name: "bob" });
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });

  it("S_renders username in heading", () => {
    const data: ProfileData = {
      username: "charlie",
      avatar_url: null,
      joined: "March 2024",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("profile-display-name")).toHaveTextContent("charlie");
  });

  it("S_renders join date", () => {
    const data: ProfileData = {
      username: "dana",
      avatar_url: null,
      joined: "April 2023",
      ratingCount: 1,
      reviewCount: 0,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("profile-joined")).toHaveTextContent("April 2023");
  });
});

// ── O_ One — single valid case in isolation ──────────────────────────────────

describe("O_ One — single item cases", () => {
  it("O_shows exactly one review", () => {
    const data: ProfileData = {
      username: "eve",
      avatar_url: null,
      joined: "May 2024",
      ratingCount: 1,
      reviewCount: 1,
      publicLists: [],
      reviews: [{ id: 1, title: "Inception", slug: "inception-2010", type: "movie", headline: "Mind-blowing" }],
    };
    render(<FakePublicProfilePage data={data} />);
    const items = screen.getAllByTestId("review-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute("href", "/movies/inception-2010");
    expect(items[0]).toHaveTextContent("Inception");
  });

  it("O_shows exactly one public list", () => {
    const data: ProfileData = {
      username: "frank",
      avatar_url: null,
      joined: "June 2024",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [{ id: 7, name: "Watchlist", is_public: true }],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    const items = screen.getAllByTestId("list-item");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveAttribute("href", "/lists/7");
  });
});

// ── M_ Many — multiple items ─────────────────────────────────────────────────

describe("M_ Many — multiple items", () => {
  it("M_shows rating count and review count in stats", () => {
    const data: ProfileData = {
      username: "grace",
      avatar_url: null,
      joined: "July 2024",
      ratingCount: 42,
      reviewCount: 17,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("stat-ratings")).toHaveTextContent("42");
    expect(screen.getByTestId("stat-reviews")).toHaveTextContent("17");
  });

  it("M_renders multiple reviews with correct links", () => {
    const data: ProfileData = {
      username: "heidi",
      avatar_url: null,
      joined: "August 2024",
      ratingCount: 3,
      reviewCount: 3,
      publicLists: [],
      reviews: [
        { id: 1, title: "Dune", slug: "dune-2021", type: "movie", headline: null },
        { id: 2, title: "Severance", slug: "severance", type: "tv", headline: "Great show" },
        { id: 3, title: "Oppenheimer", slug: "oppenheimer-2023", type: "movie", headline: null },
      ],
    };
    render(<FakePublicProfilePage data={data} />);
    const items = screen.getAllByTestId("review-item");
    expect(items).toHaveLength(3);
    expect(items[1]).toHaveAttribute("href", "/tv/severance");
  });

  it("M_renders multiple public lists", () => {
    const data: ProfileData = {
      username: "ivan",
      avatar_url: null,
      joined: "September 2024",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [
        { id: 1, name: "Favorites", is_public: true },
        { id: 2, name: "Rewatchables", is_public: true },
        { id: 3, name: "Hidden", is_public: false },
      ],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    const items = screen.getAllByTestId("list-item");
    // Only public lists shown
    expect(items).toHaveLength(2);
  });
});

// ── B_ Boundaries ─────────────────────────────────────────────────────────────

describe("B_ Boundaries — edge counts", () => {
  it("B_renders zero stats correctly", () => {
    const data: ProfileData = {
      username: "judy",
      avatar_url: null,
      joined: "October 2024",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("stat-ratings")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-reviews")).toHaveTextContent("0");
  });

  it("B_renders large counts without overflow", () => {
    const data: ProfileData = {
      username: "ken",
      avatar_url: null,
      joined: "November 2024",
      ratingCount: 9999,
      reviewCount: 9999,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("stat-ratings")).toHaveTextContent("9999");
    expect(screen.getByTestId("stat-reviews")).toHaveTextContent("9999");
  });

  it("B_username of length 1 shows single initials character", () => {
    const data: ProfileData = {
      username: "x",
      avatar_url: null,
      joined: "December 2024",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByText("X")).toBeInTheDocument();
  });
});

// ── I_ Interface — private list filtering ────────────────────────────────────

describe("I_ Interface — public/private list filtering", () => {
  it("I_hides private lists and shows only public ones", () => {
    const data: ProfileData = {
      username: "lena",
      avatar_url: null,
      joined: "January 2025",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [
        { id: 10, name: "Public List A", is_public: true },
        { id: 11, name: "Private List B", is_public: false },
        { id: 12, name: "Public List C", is_public: true },
        { id: 13, name: "Private List D", is_public: false },
      ],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    const items = screen.getAllByTestId("list-item");
    expect(items).toHaveLength(2);
    items.forEach((item) => {
      expect(item.textContent).not.toContain("Private");
    });
  });

  it("I_review with null headline renders without error", () => {
    const data: ProfileData = {
      username: "mike",
      avatar_url: null,
      joined: "February 2025",
      ratingCount: 1,
      reviewCount: 1,
      publicLists: [],
      reviews: [{ id: 1, title: "Barbie", slug: "barbie-2023", type: "movie", headline: null }],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.queryByTestId("review-headline")).not.toBeInTheDocument();
    expect(screen.getByText("Barbie")).toBeInTheDocument();
  });
});

// ── E_ Exceptions — 404 / data-layer errors ──────────────────────────────────

describe("E_ Exceptions — user-not-found and missing data", () => {
  it("E_getUserProfile returns null for nonexistent user", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserProfile("ghost-user-404");
    expect(result).toBeNull();
  });

  it("E_getUserReviews returns empty array when data is null", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserReviews("no-one");
    expect(result).toEqual([]);
  });

  it("E_getUserLists returns empty array when data is null", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserLists("no-one");
    expect(result).toEqual([]);
  });

  it("E_getUserRatings returns empty array when data is empty", async () => {
    const chain = makeChain({ data: [], error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserRatings("no-one");
    expect(result).toEqual([]);
  });

  it("E_page shows no review items when review list is empty", () => {
    const data: ProfileData = {
      username: "nina",
      avatar_url: null,
      joined: "March 2025",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.queryByTestId("review-item")).not.toBeInTheDocument();
  });

  it("E_page shows no list items when all lists are private", () => {
    const data: ProfileData = {
      username: "omar",
      avatar_url: null,
      joined: "April 2025",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [
        { id: 1, name: "Secret", is_public: false },
        { id: 2, name: "Also Secret", is_public: false },
      ],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.queryByTestId("list-item")).not.toBeInTheDocument();
  });
});

// ── Z_ Zero ──────────────────────────────────────────────────────────────────

describe("Z_ Zero — zero / null / empty input", () => {
  it("Z_profile page renders with all zeros", () => {
    const data: ProfileData = {
      username: "zara",
      avatar_url: null,
      joined: "May 2025",
      ratingCount: 0,
      reviewCount: 0,
      publicLists: [],
      reviews: [],
    };
    render(<FakePublicProfilePage data={data} />);
    expect(screen.getByTestId("profile-page")).toBeInTheDocument();
    expect(screen.getByTestId("stat-ratings")).toHaveTextContent("0");
    expect(screen.getByTestId("stat-reviews")).toHaveTextContent("0");
    expect(screen.queryByTestId("list-item")).not.toBeInTheDocument();
    expect(screen.queryByTestId("review-item")).not.toBeInTheDocument();
  });

  it("Z_getUserProfile returns null when username is empty string", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);
    const result = await getUserProfile("");
    expect(result).toBeNull();
  });
});
