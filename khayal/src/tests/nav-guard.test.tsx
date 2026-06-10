import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NavGuard } from "@/components/nav-guard";

const mockPathname = vi.fn(() => "/browse");

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname(),
}));

describe("NavGuard", () => {
  it("renders children on non-root paths", () => {
    mockPathname.mockReturnValue("/browse");
    render(<NavGuard><span>navbar content</span></NavGuard>);
    expect(screen.getByText("navbar content")).toBeInTheDocument();
  });

  it("renders nothing on the root path /", () => {
    mockPathname.mockReturnValue("/");
    const { container } = render(<NavGuard><span>navbar content</span></NavGuard>);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText("navbar content")).not.toBeInTheDocument();
  });

  it("renders children on /movies/* path", () => {
    mockPathname.mockReturnValue("/movies/inception-2010");
    render(<NavGuard><span>nav</span></NavGuard>);
    expect(screen.getByText("nav")).toBeInTheDocument();
  });

  it("renders children on /search path", () => {
    mockPathname.mockReturnValue("/search");
    render(<NavGuard><span>nav</span></NavGuard>);
    expect(screen.getByText("nav")).toBeInTheDocument();
  });

  it("renders children on /profile path", () => {
    mockPathname.mockReturnValue("/profile");
    render(<NavGuard><span>nav</span></NavGuard>);
    expect(screen.getByText("nav")).toBeInTheDocument();
  });
});
