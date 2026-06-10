import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ReviewForm } from "@/components/review-form";

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

const mockUpsert = vi.fn().mockResolvedValue({ error: null });

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    from: () => ({
      upsert: mockUpsert,
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
    }),
  })),
}));

describe("ReviewForm — unauthenticated", () => {
  it("shows Sign in to review when userId is null", () => {
    render(
      <ReviewForm userId={null} kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    expect(screen.getByText("Sign in to review")).toBeInTheDocument();
  });

  it("sign-in link navigates to login page with next param", () => {
    render(
      <ReviewForm userId={null} kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/login");
    expect(link.getAttribute("href")).toContain("inception-2010");
  });
});

describe("ReviewForm — authenticated, no existing review", () => {
  it("shows 'Write a review…' prompt when not open", () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    expect(screen.getByText(/Write a review…/i)).toBeInTheDocument();
  });

  it("opens form on click", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    expect(screen.getByPlaceholderText("What did you think?")).toBeInTheDocument();
  });

  it("shows 'Write your review' heading in form", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    expect(screen.getByText("Write your review")).toBeInTheDocument();
  });

  it("shows headline input", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    expect(screen.getByPlaceholderText("Headline (optional)")).toBeInTheDocument();
  });

  it("shows spoiler checkbox", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("shows Cancel button", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
  });

  it("closes form on Cancel click", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    await userEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(screen.queryByPlaceholderText("What did you think?")).not.toBeInTheDocument();
  });

  it("submit button is present and labelled Publish review", async () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={null} />
    );
    await userEvent.click(screen.getByText(/Write a review…/i));
    // Submit button exists and has correct label
    expect(screen.getByRole("button", { name: /publish review/i })).toBeInTheDocument();
  });
});

describe("ReviewForm — authenticated, with existing review", () => {
  const existing = {
    id: 10,
    headline: "Masterpiece",
    body: "Absolutely stunning.",
    contains_spoiler: false,
  };

  it("opens the form immediately when existing review", () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={existing} />
    );
    expect(screen.getByPlaceholderText("What did you think?")).toBeInTheDocument();
  });

  it("shows 'Edit your review' heading", () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={existing} />
    );
    expect(screen.getByText("Edit your review")).toBeInTheDocument();
  });

  it("pre-fills body with existing body", () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={existing} />
    );
    const textarea = screen.getByPlaceholderText("What did you think?") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Absolutely stunning.");
  });

  it("shows Delete button", () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={existing} />
    );
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("shows 'Update review' submit button", () => {
    render(
      <ReviewForm userId="user-1" kind="movie" targetId={1} slug="inception-2010" existing={existing} />
    );
    expect(screen.getByRole("button", { name: /update review/i })).toBeInTheDocument();
  });
});
