/**
 * Tests for DeleteContentButton (issues #143, #207).
 * #143: error surfaces in UI, deleted state NOT set on failure.
 * #207: component no longer uses anon key — calls server action deleteContent().
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mock the server action — component must call this, not direct Supabase
const mockDeleteContent = vi.fn();
vi.mock("@/app/admin/content/actions", () => ({
  deleteContent: (...args: unknown[]) => mockDeleteContent(...args),
}));

// Mock window.confirm
vi.stubGlobal("confirm", vi.fn(() => true));

import { DeleteContentButton } from "@/app/admin/content/delete-content-button";

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("DeleteContentButton (issues #143, #207)", () => {
  it("renders delete button", () => {
    mockDeleteContent.mockResolvedValue({ success: true });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    expect(screen.getByTestId("delete-content-button")).toBeInTheDocument();
  });

  it("shows Deleted text on success", async () => {
    mockDeleteContent.mockResolvedValue({ success: true });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });
  });

  it("shows error message when server action returns error", async () => {
    mockDeleteContent.mockResolvedValue({ success: false, error: "Admin access required." });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByTestId("delete-content-error")).toBeInTheDocument();
      expect(screen.getByTestId("delete-content-error")).toHaveTextContent("Admin access required.");
    });
  });

  it("shows error when server action reports RLS violation", async () => {
    mockDeleteContent.mockResolvedValue({ success: false, error: "RLS policy violation" });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByTestId("delete-content-error")).toHaveTextContent("RLS policy violation");
    });
  });

  it("does NOT set deleted=true when operation fails", async () => {
    mockDeleteContent.mockResolvedValue({ success: false, error: "Network error" });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.queryByText("Deleted")).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("delete-content-button")).toBeInTheDocument();
  });

  it("does nothing when confirm cancelled", () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    mockDeleteContent.mockResolvedValue({ success: true });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    expect(mockDeleteContent).not.toHaveBeenCalled();
  });

  it("works for tv type", async () => {
    mockDeleteContent.mockResolvedValue({ success: true });
    render(<DeleteContentButton id={2} type="tv" title="Test Show" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByText("Deleted")).toBeInTheDocument();
    });
    expect(mockDeleteContent).toHaveBeenCalledWith(2, "tv");
  });

  it("passes correct id and type to server action", async () => {
    mockDeleteContent.mockResolvedValue({ success: true });
    render(<DeleteContentButton id={42} type="movies" title="Some Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(mockDeleteContent).toHaveBeenCalledWith(42, "movies");
    });
  });

  it("shows not-authenticated error from server action", async () => {
    mockDeleteContent.mockResolvedValue({ success: false, error: "Not authenticated." });
    render(<DeleteContentButton id={1} type="movies" title="Test Movie" />);
    fireEvent.click(screen.getByTestId("delete-content-button"));
    await waitFor(() => {
      expect(screen.getByTestId("delete-content-error")).toHaveTextContent("Not authenticated.");
    });
  });
});
