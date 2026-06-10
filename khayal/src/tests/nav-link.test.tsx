import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavLink } from "@/components/nav-link";

const mockPathname = vi.fn(() => "/browse");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

describe("NavLink", () => {
  it("renders a link with the given label", () => {
    mockPathname.mockReturnValue("/browse");
    render(<NavLink href="/browse" label="Films" />);
    expect(screen.getByText("Films")).toBeInTheDocument();
  });

  it("link points to the correct href", () => {
    mockPathname.mockReturnValue("/browse");
    render(<NavLink href="/browse" label="Films" />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/browse");
  });

  it("applies active styling when pathname matches", () => {
    mockPathname.mockReturnValue("/browse");
    render(<NavLink href="/browse" label="Films" />);
    const link = screen.getByRole("link");
    expect(link.className).toContain("text-[var(--cream)]");
  });

  it("applies inactive styling when pathname does not match", () => {
    mockPathname.mockReturnValue("/search");
    render(<NavLink href="/browse" label="Films" />);
    const link = screen.getByRole("link");
    expect(link.className).toContain("text-[var(--cream-muted)]");
  });

  it("treats sub-paths as active (e.g. /browse/action)", () => {
    mockPathname.mockReturnValue("/browse/action");
    render(<NavLink href="/browse" label="Films" />);
    const link = screen.getByRole("link");
    expect(link.className).toContain("text-[var(--cream)]");
  });

  it("renders children text correctly", () => {
    mockPathname.mockReturnValue("/");
    render(<NavLink href="/search" label="Search" />);
    expect(screen.getByText("Search")).toBeInTheDocument();
  });
});
