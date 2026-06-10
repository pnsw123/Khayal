import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TicketEnter, ProfileStub } from "@/components/nav-controls";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/browse",
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    auth: { signOut: vi.fn().mockResolvedValue({}) },
  })),
}));

describe("TicketEnter", () => {
  it("renders Sign In link", () => {
    render(<TicketEnter />);
    expect(screen.getByText("Sign In")).toBeInTheDocument();
  });

  it("links to /login", () => {
    render(<TicketEnter />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/login");
  });

  it("accepts className prop without throwing", () => {
    expect(() => render(<TicketEnter className="ml-2" />)).not.toThrow();
  });
});

describe("ProfileStub", () => {
  const defaultProps = {
    initial: "Y",
    email: "test@example.com",
    username: "yazeed",
    avatarUrl: null,
  };

  it("renders avatar initial", () => {
    render(<ProfileStub {...defaultProps} />);
    expect(screen.getByText("Y")).toBeInTheDocument();
  });

  it("opens dropdown on button click", async () => {
    render(<ProfileStub {...defaultProps} />);
    const btn = screen.getByRole("button", { name: /account menu/i });
    await userEvent.click(btn);
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
  });

  it("shows profile links in dropdown", async () => {
    render(<ProfileStub {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("My profile")).toBeInTheDocument();
  });

  it("shows public profile link when username provided", async () => {
    render(<ProfileStub {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Public profile")).toBeInTheDocument();
  });

  it("shows Admin panel for admin email", async () => {
    render(<ProfileStub {...defaultProps} email="yazeedjunk@gmail.com" />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Admin panel")).toBeInTheDocument();
  });

  it("does not show Admin panel for non-admin email", async () => {
    render(<ProfileStub {...defaultProps} email="other@example.com" />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.queryByText("Admin panel")).not.toBeInTheDocument();
  });

  it("shows sign out button in dropdown", async () => {
    render(<ProfileStub {...defaultProps} />);
    await userEvent.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  it("renders avatar image when avatarUrl provided", () => {
    render(<ProfileStub {...defaultProps} avatarUrl="https://example.com/avatar.jpg" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/avatar.jpg");
  });
});
