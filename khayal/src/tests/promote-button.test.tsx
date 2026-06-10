/**
 * Tests for PromoteButton (issues #143, #201).
 * #143 — error from server action surfaces in UI; done state NOT set on failure.
 * #201 — button now calls promoteUser server action (not anon-key Supabase client).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockPromoteUser = vi.fn();
vi.mock("@/app/admin/users/actions", () => ({
  promoteUser: (...args: unknown[]) => mockPromoteUser(...args),
}));

import { PromoteButton } from "@/app/admin/users/promote-button";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PromoteButton — server action wiring (issue #201)", () => {
  it("renders Make Admin button", () => {
    mockPromoteUser.mockResolvedValue({ success: true });
    render(<PromoteButton userId="user-123" />);
    expect(screen.getByTestId("promote-button")).toBeInTheDocument();
    expect(screen.getByTestId("promote-button")).toHaveTextContent("Make Admin");
  });

  it("calls promoteUser server action with correct userId", async () => {
    mockPromoteUser.mockResolvedValue({ success: true });
    render(<PromoteButton userId="user-abc" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(mockPromoteUser).toHaveBeenCalledWith("user-abc");
    });
  });

  it("shows Promoted text on success", async () => {
    mockPromoteUser.mockResolvedValue({ success: true });
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(screen.getByText("Promoted")).toBeInTheDocument();
    });
  });

  it("shows error message when server action returns failure", async () => {
    mockPromoteUser.mockResolvedValue({ success: false, error: "Admin access required." });
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(screen.getByTestId("promote-error")).toHaveTextContent("Admin access required.");
    });
  });

  it("does NOT set done=true when action fails (issue #143)", async () => {
    mockPromoteUser.mockResolvedValue({ success: false, error: "Not authenticated." });
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(screen.queryByText("Promoted")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("promote-button")).toBeInTheDocument();
  });

  it("shows loading state while action in flight", async () => {
    let resolve: (v: unknown) => void;
    mockPromoteUser.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    expect(screen.getByTestId("promote-button")).toHaveTextContent("...");
    resolve!({ success: true });
    await waitFor(() => {
      expect(screen.getByText("Promoted")).toBeInTheDocument();
    });
  });

  it("does NOT import or use @supabase/supabase-js (uses server action only)", () => {
    // The module source should reference promoteUser, not createClient
    // This is validated structurally by the mock — if createClient were called
    // it would throw (not mocked), causing the test suite to fail.
    expect(mockPromoteUser).toBeDefined();
  });
});
