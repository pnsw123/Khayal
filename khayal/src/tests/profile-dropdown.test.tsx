import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockSignOut = vi.fn().mockResolvedValue({});
const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: { signOut: mockSignOut },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

import { ProfileDropdown } from "@/app/profile/profile-dropdown";

beforeEach(() => {
  mockSignOut.mockClear();
  mockPush.mockClear();
  mockRefresh.mockClear();
});

describe("ProfileDropdown", () => {
  it("renders Menu toggle button", () => {
    render(<ProfileDropdown email="user@test.com" />);
    expect(screen.getByRole("button", { name: /menu/i })).toBeInTheDocument();
  });

  it("dropdown hidden by default", () => {
    render(<ProfileDropdown email="user@test.com" />);
    expect(screen.queryByRole("link", { name: /sign out/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("opens dropdown on click", () => {
    render(<ProfileDropdown email="user@test.com" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("shows Public profile link when username given", () => {
    render(<ProfileDropdown email="user@test.com" username="alice" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    const link = screen.getByRole("link", { name: /public profile/i });
    expect(link).toHaveAttribute("href", "/users/alice");
  });

  it("shows Admin link for admin email", () => {
    render(<ProfileDropdown email="yazeedjunk@gmail.com" username="admin" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.getByRole("link", { name: /admin/i })).toHaveAttribute("href", "/admin");
  });

  it("does not show Admin link for non-admin email", () => {
    render(<ProfileDropdown email="normal@test.com" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    expect(screen.queryByRole("link", { name: /^admin$/i })).not.toBeInTheDocument();
  });

  it("sign out button calls signOut and navigates to /browse", async () => {
    render(<ProfileDropdown email="user@test.com" />);
    fireEvent.click(screen.getByRole("button", { name: /menu/i }));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    });
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });
});
