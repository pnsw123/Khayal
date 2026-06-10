import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToListButton, type UserList } from "@/components/add-to-list";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    from: () => ({
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }) }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 99, name: "New List", is_favorites: false, is_public: false },
            error: null,
          }),
        }),
      }),
    }),
  })),
}));

const LISTS: UserList[] = [
  { id: 1, name: "Favorites", is_favorites: true, is_public: false, member: false },
  { id: 2, name: "Watchlist", is_favorites: false, is_public: false, member: false },
];

describe("AddToListButton — unauthenticated", () => {
  it("shows 'Sign in to save' when userId is null", () => {
    render(
      <AddToListButton userId={null} kind="movie" targetId={1} slug="inception-2010" initialLists={[]} />
    );
    expect(screen.getByText("Sign in to save")).toBeInTheDocument();
  });

  it("sign in link navigates to login", () => {
    render(
      <AddToListButton userId={null} kind="movie" targetId={1} slug="inception-2010" initialLists={[]} />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/login");
  });
});

describe("AddToListButton — authenticated", () => {
  it("shows 'Add to list' button when no memberships", () => {
    render(
      <AddToListButton userId="user-1" kind="movie" targetId={1} slug="inception-2010" initialLists={LISTS} />
    );
    expect(screen.getByRole("button", { name: /add to list/i })).toBeInTheDocument();
  });

  it("shows 'In your lists' when at least one list has member=true", () => {
    const listsWithMember = [{ ...LISTS[0], member: true }, LISTS[1]];
    render(
      <AddToListButton userId="user-1" kind="movie" targetId={1} slug="inception-2010" initialLists={listsWithMember} />
    );
    expect(screen.getByRole("button", { name: /in your lists/i })).toBeInTheDocument();
  });

  it("opens dropdown on button click", async () => {
    render(
      <AddToListButton userId="user-1" kind="movie" targetId={1} slug="inception-2010" initialLists={LISTS} />
    );
    await userEvent.click(screen.getByRole("button", { name: /add to list/i }));
    expect(screen.getByText("Favorites")).toBeInTheDocument();
    expect(screen.getByText("Watchlist")).toBeInTheDocument();
  });

  it("shows 'New list' button in dropdown", async () => {
    render(
      <AddToListButton userId="user-1" kind="movie" targetId={1} slug="inception-2010" initialLists={LISTS} />
    );
    await userEvent.click(screen.getByRole("button", { name: /add to list/i }));
    expect(screen.getByText(/New list/i)).toBeInTheDocument();
  });

  it("shows create input after clicking New list", async () => {
    render(
      <AddToListButton userId="user-1" kind="movie" targetId={1} slug="inception-2010" initialLists={LISTS} />
    );
    await userEvent.click(screen.getByRole("button", { name: /add to list/i }));
    await userEvent.click(screen.getByText(/New list/i));
    expect(screen.getByPlaceholderText("New list name…")).toBeInTheDocument();
  });

  it("shows 'No lists yet' when lists are empty", async () => {
    render(
      <AddToListButton userId="user-1" kind="movie" targetId={1} slug="inception-2010" initialLists={[]} />
    );
    await userEvent.click(screen.getByRole("button", { name: /add to list/i }));
    expect(screen.getByText(/No lists yet/i)).toBeInTheDocument();
  });
});
