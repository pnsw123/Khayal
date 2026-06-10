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

import { SignOutButton } from "@/app/profile/sign-out-button";

beforeEach(() => {
  mockSignOut.mockClear();
  mockPush.mockClear();
  mockRefresh.mockClear();
});

describe("SignOutButton", () => {
  it("renders sign out button", () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("is not disabled initially", () => {
    render(<SignOutButton />);
    expect(screen.getByRole("button")).not.toBeDisabled();
  });

  it("calls signOut and redirects to /browse on click", async () => {
    render(<SignOutButton />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button"));
    });
    expect(mockSignOut).toHaveBeenCalledOnce();
    expect(mockPush).toHaveBeenCalledWith("/browse");
  });
});
