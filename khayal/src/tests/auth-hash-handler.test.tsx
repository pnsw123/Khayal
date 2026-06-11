import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";

const mockSetSession = vi.fn();
const mockReplace = vi.fn();
const mockRefresh = vi.fn();
let locationReplaceSpy: ReturnType<typeof vi.fn>;
let mockLocation: { hash: string; pathname: string; replace: ReturnType<typeof vi.fn> };

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    auth: { setSession: mockSetSession },
  }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, refresh: mockRefresh }),
}));

import { AuthHashHandler } from "@/components/auth-hash-handler";

// jsdom marks window.location.replace non-configurable so vi.spyOn throws.
// Use vi.stubGlobal to replace the whole location with a controllable mock.
function setHash(hash: string) {
  mockLocation.hash = hash;
}

beforeEach(() => {
  mockSetSession.mockReset();
  mockReplace.mockReset();
  mockRefresh.mockReset();
  locationReplaceSpy = vi.fn();
  mockLocation = { hash: "", pathname: "/", replace: locationReplaceSpy };
  vi.stubGlobal("location", mockLocation);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthHashHandler", () => {
  it("renders nothing", () => {
    const { container } = render(<AuthHashHandler />);
    expect(container.firstChild).toBeNull();
  });

  it("does nothing when there is no hash", async () => {
    render(<AuthHashHandler />);
    await waitFor(() => expect(mockSetSession).not.toHaveBeenCalled());
    expect(locationReplaceSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("calls setSession with implicit-flow tokens and full-navigates to /browse", async () => {
    mockSetSession.mockResolvedValue({ error: null });
    setHash("#access_token=ACCESS123&refresh_token=REFRESH456&type=signup");

    render(<AuthHashHandler />);

    await waitFor(() =>
      expect(mockSetSession).toHaveBeenCalledWith({
        access_token: "ACCESS123",
        refresh_token: "REFRESH456",
      })
    );
    // Success path does a full-document navigation (drops the hash, re-renders
    // the server route with the new auth cookie) rather than a router.replace.
    await waitFor(() => expect(locationReplaceSpy).toHaveBeenCalledWith("/browse"));
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("redirects to /login with the error when setSession fails", async () => {
    mockSetSession.mockResolvedValue({ error: { message: "token expired" } });
    setHash("#access_token=ACCESS123&refresh_token=REFRESH456");

    render(<AuthHashHandler />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith("/login?error=token%20expired")
    );
    expect(locationReplaceSpy).not.toHaveBeenCalled();
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
    expect(locationReplaceSpy).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
