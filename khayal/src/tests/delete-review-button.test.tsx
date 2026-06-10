/**
 * Tests for issue #143: DeleteReviewButton error handling.
 * Verifies silent-failure bug is fixed — error from Supabase surfaces in UI,
 * deleted state NOT set when operation fails.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

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

vi.stubGlobal("confirm", vi.fn(() => true));

import { DeleteReviewButton } from "@/app/admin/reviews/delete-review-button";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("DeleteReviewButton — error handling (issue #143)", () => {
  it("renders delete button", () => {
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteReviewButton reviewId={10} type="movie" />);
    expect(screen.getByTestId("delete-review-button")).toBeInTheDocument();
  });

  it("shows Deleted text on success", async () => {
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteReviewButton reviewId={10} type="movie" />);
    fireEvent.click(screen.getByTestId("delete-review-button"));
    await waitFor(() => {
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });
  });

  it("shows error message when Supabase returns error", async () => {
    mockDelete.mockResolvedValue({ error: { message: "Row not found" } });
    render(<DeleteReviewButton reviewId={10} type="movie" />);
    fireEvent.click(screen.getByTestId("delete-review-button"));
    await waitFor(() => {
      expect(screen.getByTestId("delete-review-error")).toHaveTextContent("Row not found");
    });
  });

  it("does NOT set deleted=true when operation fails", async () => {
    mockDelete.mockResolvedValue({ error: { message: "Forbidden" } });
    render(<DeleteReviewButton reviewId={10} type="movie" />);
    fireEvent.click(screen.getByTestId("delete-review-button"));
    await waitFor(() => {
      expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("delete-review-button")).toBeInTheDocument();
  });

  it("does nothing when confirm cancelled", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteReviewButton reviewId={10} type="movie" />);
    fireEvent.click(screen.getByTestId("delete-review-button"));
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("works for tv type (uses tv_series_reviews table)", async () => {
    mockDelete.mockResolvedValue({ error: null });
    render(<DeleteReviewButton reviewId={11} type="tv" />);
    fireEvent.click(screen.getByTestId("delete-review-button"));
    await waitFor(() => {
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });
  });
});
