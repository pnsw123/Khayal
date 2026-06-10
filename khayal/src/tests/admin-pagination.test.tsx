import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdminPagination } from "@/components/admin-pagination";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: import("react").ReactNode } & Record<string, unknown>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AdminPagination", () => {
  it("renders nothing when totalPages is 1", () => {
    const { container } = render(
      <AdminPagination
        current={1}
        totalPages={1}
        totalRows={10}
        basePath="/admin/users"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when totalPages is 0", () => {
    const { container } = render(
      <AdminPagination
        current={1}
        totalPages={0}
        totalRows={0}
        basePath="/admin/users"
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders pagination nav when totalPages > 1", () => {
    render(
      <AdminPagination
        current={1}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    expect(screen.getByTestId("admin-pagination")).toBeTruthy();
  });

  it("shows total rows formatted", () => {
    render(
      <AdminPagination
        current={1}
        totalPages={3}
        totalRows={1234}
        basePath="/admin/users"
      />
    );
    expect(screen.getByText("1,234")).toBeTruthy();
  });

  it("disables prev on first page", () => {
    render(
      <AdminPagination
        current={1}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    expect(screen.queryByTestId("pagination-prev")).toBeNull();
  });

  it("shows prev link when not on first page", () => {
    render(
      <AdminPagination
        current={3}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    const prev = screen.getByTestId("pagination-prev");
    expect(prev).toBeTruthy();
    expect((prev as HTMLAnchorElement).href).toContain("page=2");
  });

  it("disables next on last page", () => {
    render(
      <AdminPagination
        current={5}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    expect(screen.queryByTestId("pagination-next")).toBeNull();
  });

  it("shows next link when not on last page", () => {
    render(
      <AdminPagination
        current={3}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    const next = screen.getByTestId("pagination-next");
    expect(next).toBeTruthy();
    expect((next as HTMLAnchorElement).href).toContain("page=4");
  });

  it("page 1 link has no ?page param", () => {
    render(
      <AdminPagination
        current={2}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    const prev = screen.getByTestId("pagination-prev") as HTMLAnchorElement;
    expect(prev.href).toMatch(/\/admin\/users$/);
  });

  it("marks current page with aria-current", () => {
    render(
      <AdminPagination
        current={2}
        totalPages={5}
        totalRows={125}
        basePath="/admin/users"
      />
    );
    const current = screen.getByTestId("pagination-current");
    expect(current.getAttribute("aria-current")).toBe("page");
  });

  it("limits window to 7 pages max", () => {
    render(
      <AdminPagination
        current={10}
        totalPages={20}
        totalRows={500}
        basePath="/admin/content"
      />
    );
    const links = screen
      .getAllByRole("link")
      .filter((el) => /^\d+$/.test(el.textContent ?? ""));
    expect(links.length).toBeLessThanOrEqual(7);
  });
});
