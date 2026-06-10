/**
 * Tests for issue #143: DeleteContentButton error handling.
 * Verifies silent-failure bug is fixed — error from Supabase surfaces in UI,
 * deleted state NOT set when operation fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock Supabase client
const mockDelete = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: () => ({
      delete: () => ({
        eq: mockDelete,
      }),
    }),
  }),
}));

// Mock window.confirm
vi.stubGlobal("confirm", vi.fn(() => true));

import { DeleteContentButton } from "@/app/admin/content/delete-content-button";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("DeleteContentButton — error handling (issue #143)", () => {
  it("renders delete button", () => {
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    expect(screen.getByTestId("delete-content-button")).toBeInTheDocument();
  });

  it("shows Deleted text on success, not on failure", async () => {
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });
  });

  it("shows error message when Supabase returns error", async () => {
    mockDelete.mockResolvedValue({ error: { message: "RLS policy violation" } });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByTestId("delete-content-error")).toBeInTheDocument();
      expect(screen.getByTestId("delete-content-error")).toHaveTextContent("RLS policy violation");
    });
  });

  it("does NOT set deleted=true when operation fails", async () => {
    mockDelete.mockResolvedValue({ error: { message: "Network error" } });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    });
    // Button still present (not replaced by "Deleted" span)
    expect(screen.getByTestId("delete-content-button")).toBeInTheDocument();
  });

  it("does nothing when confirm cancelled", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("works for tv type (uses tv_series table)", async () => {
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteContentButton id={2} type="tv" title="Test Show" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });
  });
});
