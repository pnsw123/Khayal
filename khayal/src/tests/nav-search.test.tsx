import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NavSearch } from "@/components/nav-search";
import { readFileSync } from "fs";
import { resolve } from "path";

// --- Nav container alignment test ---
describe("Nav container alignment", () => {
  it("nav inner container uses max-w-[1600px] to match page content width", () => {
    const navSource = readFileSync(
      resolve(__dirname, "../components/nav.tsx"),
      "utf-8"
    );
    expect(navSource).toContain("max-w-[1600px]");
    expect(navSource).not.toContain("max-w-5xl");
  });
});

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, onClick }: any) => (
    <a href={href} onClick={onClick}>{children}</a>
  ),
}));

const MOCK_RESULTS = [
  { id: 1, type: "movie", title: "Batman Begins", slug: "batman-begins-2005", poster_url: null, release_year: 2005 },
  { id: 2, type: "movie", title: "Batman Returns", slug: "batman-returns-1992", poster_url: null, release_year: 1992 },
];

describe("NavSearch", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-key");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    mockPush.mockClear();
  });

  it("renders the search input", () => {
    render(<NavSearch />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("does not show dropdown for fewer than 2 characters", async () => {
    render(<NavSearch />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "b");
    expect(screen.queryByText(/results/i)).not.toBeInTheDocument();
  });

  it("shows results dropdown after typing 2+ characters", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESULTS,
    });

    render(<NavSearch />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "bat");

    await waitFor(() => {
      expect(screen.getByText("Batman Begins")).toBeInTheDocument();
      expect(screen.getByText("Batman Returns")).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("shows year and type for each result", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESULTS,
    });

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "bat");

    await waitFor(() => {
      expect(screen.getByText("2005 · Film")).toBeInTheDocument();
      expect(screen.getByText("1992 · Film")).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("shows 'no results' when API returns empty array", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "xyzzy");

    await waitFor(() => {
      expect(screen.getByText(/No results for/i)).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("navigates to /search on Enter key", async () => {
    render(<NavSearch />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "batman");
    await userEvent.keyboard("{Enter}");
    expect(mockPush).toHaveBeenCalledWith("/search?q=batman");
  });

  it("closes dropdown on Escape", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => MOCK_RESULTS,
    });

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "bat");
    await waitFor(() => expect(screen.getByText("Batman Begins")).toBeInTheDocument(), { timeout: 1000 });

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Batman Begins")).not.toBeInTheDocument();
  });

  it("calls search_all RPC with correct endpoint and method", async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
    global.fetch = mockFetch;

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "inception");

    await waitFor(() => expect(mockFetch).toHaveBeenCalled(), { timeout: 1500 });

    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toContain("/rest/v1/rpc/search_all");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body).page_size).toBe(8);
  });
});
