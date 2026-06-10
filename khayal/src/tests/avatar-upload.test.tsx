import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: "https://cdn.test/avatar.jpg" } });
const mockUpdate = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: () => ({
    storage: {
      from: () => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      }),
    },
    from: () => ({
      update: () => ({
        eq: mockUpdate,
      }),
    }),
  }),
}));

// createObjectURL not available in jsdom
global.URL.createObjectURL = vi.fn().mockReturnValue("blob:fake-url");

import { AvatarUpload } from "@/app/profile/avatar-upload";

beforeEach(() => {
  mockUpload.mockClear();
  mockUpdate.mockClear();
});

describe("AvatarUpload", () => {
  it("renders initials when no avatar URL", () => {
    render(<AvatarUpload userId="user-1" avatarUrl={null} displayName="Alice" />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("renders avatar img when URL provided", () => {
    render(<AvatarUpload userId="user-1" avatarUrl="https://cdn.test/img.jpg" displayName="Alice" />);
    expect(screen.getByRole("img", { name: "Alice" })).toHaveAttribute("src", "https://cdn.test/img.jpg");
  });

  it("renders file input (hidden)", () => {
    const { container } = render(<AvatarUpload userId="user-1" avatarUrl={null} displayName="Bob" />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass("hidden");
  });

  it("accepts only image formats", () => {
    const { container } = render(<AvatarUpload userId="user-1" avatarUrl={null} displayName="Bob" />);
    const input = container.querySelector('input[type="file"]');
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
  });

  it("shows error message when upload fails", async () => {
    mockUpload.mockResolvedValueOnce({ error: { message: "size exceeded" } });
    render(<AvatarUpload userId="user-1" avatarUrl={null} displayName="Bob" />);
    const { container } = render(<AvatarUpload userId="user-1" avatarUrl={null} displayName="Bob" />);
    const input = container.querySelector('input[type="file"]')!;
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    // Error message appears
    expect(screen.getAllByText("Upload failed").length).toBeGreaterThan(0);
  });
});
