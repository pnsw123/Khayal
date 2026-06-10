/**
 * Tests for issue #143: PromoteButton error handling.
 * Verifies silent-failure bug is fixed — error from Supabase surfaces in UI,
 * done state NOT set when operation fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockUpdate = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      update: () => ({
        eq: mockUpdate,
      }),
    }),
  }),
}));

import { PromoteButton } from "@/app/admin/users/promote-button";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("PromoteButton — error handling (issue #143)", () => {
  it("renders Make Admin button", () => {
    mockUpdate.mockResolvedValue({ error: null });
    render(<PromoteButton userId="user-123" />);
    expect(screen.getByTestId("promote-button")).toBeInTheDocument();
    expect(screen.getByTestId("promote-button")).toHaveTextContent("Make Admin");
  });

  it("shows Promoted text on success", async () => {
    mockUpdate.mockResolvedValue({ error: null });
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(screen.getByText("Promoted")).toBeInTheDocument();
    });
  });

  it("shows error message when Supabase returns error", async () => {
    mockUpdate.mockResolvedValue({ error: { message: "Permission denied" } });
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(screen.getByTestId("promote-error")).toHaveTextContent("Permission denied");
    });
  });

  it("does NOT set done=true when operation fails", async () => {
    mockUpdate.mockResolvedValue({ error: { message: "RLS blocked" } });
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    await waitFor(() => {
      expect(screen.queryByText("Promoted")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("promote-button")).toBeInTheDocument();
  });

  it("shows loading state while request in flight", async () => {
    let resolve: (v: unknown) => void;
    mockUpdate.mockReturnValue(new Promise((r) => { resolve = r; }));
    render(<PromoteButton userId="user-123" />);
    fireEvent.click(screen.getByTestId("promote-button"));
    expect(screen.getByTestId("promote-button")).toHaveTextContent("...");
    resolve!({ error: null });
    await waitFor(() => {
      expect(screen.getByText("Promoted")).toBeInTheDocument();
    });
  });
});
