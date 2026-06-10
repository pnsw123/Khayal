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

// Mock supabase-browser so no real credentials needed
const mockRpc = vi.fn();
vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({ rpc: mockRpc }),
}));

const MOCK_RESULTS = [
  { id: 1, type: "movie", title: "Batman Begins", slug: "batman-begins-2005", poster_url: null, release_year: 2005 },
  { id: 2, type: "movie", title: "Batman Returns", slug: "batman-returns-1992", poster_url: null, release_year: 1992 },
];

describe("NavSearch", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    mockRpc.mockResolvedValue({ data: MOCK_RESULTS, error: null });

    render(<NavSearch />);
    const input = screen.getByRole("textbox");
    await userEvent.type(input, "bat");

    await waitFor(() => {
      expect(screen.getByText("Batman Begins")).toBeInTheDocument();
      expect(screen.getByText("Batman Returns")).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("shows year and type for each result", async () => {
    mockRpc.mockResolvedValue({ data: MOCK_RESULTS, error: null });

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "bat");

    await waitFor(() => {
      expect(screen.getByText("2005 · Film")).toBeInTheDocument();
      expect(screen.getByText("1992 · Film")).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it("shows 'no results' when API returns empty array", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

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
    mockRpc.mockResolvedValue({ data: MOCK_RESULTS, error: null });

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "bat");
    await waitFor(() => expect(screen.getByText("Batman Begins")).toBeInTheDocument(), { timeout: 1000 });

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Batman Begins")).not.toBeInTheDocument();
  });

  it("calls search_all RPC with correct params", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });

    render(<NavSearch />);
    await userEvent.type(screen.getByRole("textbox"), "inception");

    await waitFor(() => expect(mockRpc).toHaveBeenCalled(), { timeout: 1500 });

    expect(mockRpc).toHaveBeenCalledWith("search_all", {
      query_text: "inception",
      page_size: 8,
    });
  });
});
