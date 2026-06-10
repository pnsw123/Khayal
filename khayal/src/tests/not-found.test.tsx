import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import NotFound from "@/app/not-found";

describe("NotFound page", () => {
  it("renders Arabic tagline", () => {
    render(<NotFound />);
    expect(screen.getByText("هذا الخيال ضاع")).toBeInTheDocument();
  });

  it("renders English headline", () => {
    render(<NotFound />);
    expect(screen.getByText("This fantasy got lost.")).toBeInTheDocument();
  });

  it("renders Back home link pointing to /browse", () => {
    render(<NotFound />);
    const link = screen.getByRole("link", { name: /back home/i });
    expect(link).toHaveAttribute("href", "/browse");
  });

  it("renders catalog hint copy", () => {
    render(<NotFound />);
    expect(screen.getByText(/isn't in the catalog/i)).toBeInTheDocument();
  });
});
