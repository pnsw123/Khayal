import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockRefresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: mockRefresh }),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

vi.mock("@/lib/supabase-browser", () => ({
  supabaseBrowser: vi.fn(() => ({
    from: () => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    }),
  })),
}));

import { getUnlitHoverClasses, RateWidget } from "@/components/rate-widget";

// ---------------------------------------------------------------------------
// Pure utility — getUnlitHoverClasses
// ---------------------------------------------------------------------------

describe("getUnlitHoverClasses — color tiers", () => {
  it("buttons 1–4 return red hover classes", () => {
    for (const n of [1, 2, 3, 4]) {
      const cls = getUnlitHoverClasses(n);
      expect(cls).toContain("hover:border-red-500/50");
      expect(cls).toContain("hover:text-red-400");
    }
  });

  it("buttons 5–7 return neutral saffron hover classes", () => {
    for (const n of [5, 6, 7]) {
      const cls = getUnlitHoverClasses(n);
      expect(cls).toContain("hover:border-[var(--saffron)]/50");
      expect(cls).toContain("hover:text-[var(--cream)]");
    }
  });

  it("buttons 8–10 return green hover classes", () => {
    for (const n of [8, 9, 10]) {
      const cls = getUnlitHoverClasses(n);
      expect(cls).toContain("hover:border-green-500/50");
      expect(cls).toContain("hover:text-green-400");
    }
  });

  it("button 1 has red hover class (boundary low)", () => {
    expect(getUnlitHoverClasses(1)).toContain("hover:border-red-500/50");
  });

  it("button 10 has green hover class (boundary high)", () => {
    expect(getUnlitHoverClasses(10)).toContain("hover:border-green-500/50");
  });

  it("button 4 is red and button 5 is neutral (tier boundary)", () => {
    expect(getUnlitHoverClasses(4)).toContain("hover:border-red-500/50");
    expect(getUnlitHoverClasses(5)).toContain("hover:border-[var(--saffron)]/50");
  });

  it("button 7 is neutral and button 8 is green (tier boundary)", () => {
    expect(getUnlitHoverClasses(7)).toContain("hover:border-[var(--saffron)]/50");
    expect(getUnlitHoverClasses(8)).toContain("hover:border-green-500/50");
  });
});

// ---------------------------------------------------------------------------
// Component render — RateWidget
// ---------------------------------------------------------------------------

describe("RateWidget — unauthenticated", () => {
  it("renders sign-in link when userId is null", () => {
    render(
      <RateWidget
        userId={null}
        kind="movie"
        targetId={1}
        initialRating={null}
        slug="inception-2010"
      />
    );
    expect(screen.getByText(/sign in to rate/i)).toBeInTheDocument();
  });

  it("sign-in link points to /login with next param", () => {
    render(
      <RateWidget
        userId={null}
        kind="movie"
        targetId={1}
        initialRating={null}
        slug="inception-2010"
      />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("/login");
    expect(link.getAttribute("href")).toContain("inception-2010");
  });

  it("sign-in link for tv encodes /tv/ path", () => {
    render(
      <RateWidget
        userId={null}
        kind="tv_series"
        targetId={5}
        initialRating={null}
        slug="breaking-bad"
      />
    );
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("%2Ftv%2F");
  });
});

describe("RateWidget — authenticated, no prior rating", () => {
  it("renders 10 rate buttons", () => {
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={null}
        slug="inception-2010"
      />
    );
    const buttons = screen.getAllByRole("button", { name: /rate \d+ out of 10/i });
    expect(buttons).toHaveLength(10);
  });

  it("does not render Clear button when no prior rating", () => {
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={null}
        slug="inception-2010"
      />
    );
    expect(screen.queryByTestId("clear-rating-button")).not.toBeInTheDocument();
  });

  it("shows 'Your rating' label", () => {
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={null}
        slug="inception-2010"
      />
    );
    expect(screen.getByText(/your rating/i)).toBeInTheDocument();
  });
});

describe("RateWidget — authenticated, existing rating", () => {
  it("renders Clear button when initialRating is set", () => {
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={7}
        slug="inception-2010"
      />
    );
    expect(screen.getByTestId("clear-rating-button")).toBeInTheDocument();
  });

  it("all 10 rate buttons present with correct aria-labels", () => {
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={7}
        slug="inception-2010"
      />
    );
    for (let n = 1; n <= 10; n++) {
      expect(screen.getByLabelText(`Rate ${n} out of 10`)).toBeInTheDocument();
    }
  });

  it("rate buttons have correct data-testid attributes", () => {
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={5}
        slug="inception-2010"
      />
    );
    for (let n = 1; n <= 10; n++) {
      expect(screen.getByTestId(`rate-button-${n}`)).toBeInTheDocument();
    }
  });
});

describe("RateWidget — click interaction", () => {
  it("clicking a rate button optimistically updates state", async () => {
    const user = userEvent.setup();
    render(
      <RateWidget
        userId="user-123"
        kind="movie"
        targetId={1}
        initialRating={null}
        slug="inception-2010"
      />
    );
    const btn5 = screen.getByTestId("rate-button-5");
    await user.click(btn5);
    // After click, Clear button should appear (rating set optimistically)
    expect(screen.getByTestId("clear-rating-button")).toBeInTheDocument();
  });
});
