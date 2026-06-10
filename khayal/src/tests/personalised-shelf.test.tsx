import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PersonalisedShelf } from "@/components/personalised-shelf";

// Mock next/navigation (needed transitively)
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the supabase browser client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: { getUser: mockGetUser },
  }),
}));

const MOCK_MOVIES = [
  { id: 1, title: "Inception", slug: "inception-2010", release_date: "2010-07-16", poster_url: null, runtime_minutes: 148, age_rating: "PG-13", original_language: "en" },
  { id: 2, title: "Parasite",  slug: "parasite-2019",  release_date: "2019-05-30", poster_url: null, runtime_minutes: 132, age_rating: "R",     original_language: "ko" },
];

describe("PersonalisedShelf", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  // Test 1 — renders nothing when user is not signed in
  it("renders nothing when user is not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { container } = render(<PersonalisedShelf />);

    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  // Test 2 — shows skeleton while loading
  it("shows skeleton while loading", async () => {
    let resolve!: (v: unknown) => void;
    mockGetUser.mockReturnValue(new Promise((r) => { resolve = r; }));

    render(<PersonalisedShelf />);

    // Skeletons use animate-pulse — look for the section being present with animate-pulse divs
    const _pulsingEls = document.querySelectorAll(".animate-pulse");
    // While getUser hasn't resolved there are no skeletons yet (user unknown)
    // Resolve as logged-in user but keep fetch pending
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    resolve({ data: { user: { id: "u1" } } });

    await waitFor(() => {
      const skeletons = document.querySelectorAll(".animate-pulse");
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  // Test 3 — renders MovieCard items when fetch returns data
  it("renders MovieCard items when fetch returns data", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ movies: MOCK_MOVIES, algo: "cornac-als" }),
    });

    render(<PersonalisedShelf />);

    await waitFor(() => {
      expect(screen.getAllByText("Inception").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Parasite").length).toBeGreaterThan(0);
    });
  });

  // Test 4 — shows empty state when fetch returns empty array
  it("shows empty state message when fetch returns empty array", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ movies: [], algo: "fallback" }),
    });

    render(<PersonalisedShelf />);

    await waitFor(() => {
      expect(screen.getByText(/Rate more films to unlock personalised picks/i)).toBeInTheDocument();
    });
  });

  // Test 5 — fetch called with correct endpoint
  it("fetch called with correct endpoint /api/recommendations", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ movies: [], algo: "fallback" }),
    });
    global.fetch = mockFetch;

    render(<PersonalisedShelf />);

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/recommendations?limit=12");
  });
});
