import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mockSetSession = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: { setSession: mockSetSession },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

import { AuthHashHandler } from "@/components/auth-hash-handler";

function setHash(hash: string) {
  window.history.replaceState(null, "", `/${hash}`);
}

beforeEach(() => {
  mockSetSession.mockReset();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  window.history.replaceState(null, "", "/");
});

describe("AuthHashHandler", () => {
  it("renders nothing", () => {
    const { container } = render(<AuthHashHandler />);
    expect(container.firstChild).toBeNull();
  });

  it("does nothing when there is no hash", async () => {
    render(<AuthHashHandler />);
    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls setSession with tokens from the implicit-flow hash and redirects to /browse", async () => {
    mockSetSession.mockResolvedValue({ error: null });
    setHash("#access_token=ACCESS123&refresh_token=REFRESH456&type=signup");

    render(<AuthHashHandler />);

    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "ACCESS123",
        refresh_token: "REFRESH456",
      })
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/browse"));
    expect(mockRefresh).toHaveBeenCalled();
    // hash is stripped from the URL
    expect(window.location.hash).toBe("");
  });

  it("redirects to /login with the error when setSession fails", async () => {
    mockSetSession.mockResolvedValue({ error: { message: "token expired" } });
    setHash("#access_token=ACCESS123&refresh_token=REFRESH456");

    render(<AuthHashHandler />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?error=token%20expired")
    );
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it("surfaces an error hash on /login and never calls setSession", async () => {
    setHash("#error=access_denied&error_description=Email+link+is+invalid");

    render(<AuthHashHandler />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith(
        expect.stringContaining("/login?error=")
      )
    );
    expect(mockSetSession).not.toHaveBeenCalled();
  });

  it("ignores a hash missing the refresh_token", async () => {
    setHash("#access_token=ACCESS123");
    render(<AuthHashHandler />);
    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
