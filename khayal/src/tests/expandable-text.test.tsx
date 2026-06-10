import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpandableText } from "@/components/expandable-text";

// jsdom doesn't compute real layout, so scrollHeight === clientHeight by default.
// We need to manually mock scrollHeight to simulate clamped vs non-clamped text.

function mockScrollHeight(value: number) {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => value,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 80, // simulated visible height
  });
}

function restoreScrollHeight() {
  Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
    configurable: true,
    get: () => 0,
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get: () => 0,
  });
}

describe("ExpandableText", () => {
  beforeEach(() => {
    restoreScrollHeight();
  });

  it("renders the provided text", () => {
    render(<ExpandableText text="Hello world" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("does NOT show a Read more button when text fits within the line limit", () => {
    // scrollHeight <= clientHeight + 2 means not clamped
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", {
      configurable: true,
      get: () => 80,
    });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", {
      configurable: true,
      get: () => 80,
    });

    render(<ExpandableText text="Short text" />);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("shows a Read more button when text is clamped (scrollHeight > clientHeight)", () => {
    mockScrollHeight(200); // taller than clientHeight (80)

    render(<ExpandableText text={"A very long text ".repeat(50)} />);
    expect(screen.getByRole("button", { name: /read more/i })).toBeInTheDocument();
  });

  it("clicking Read more changes button text to Show less", () => {
    mockScrollHeight(200);

    render(<ExpandableText text={"A very long text ".repeat(50)} />);
    const btn = screen.getByRole("button", { name: /read more/i });
    fireEvent.click(btn);
    expect(screen.getByRole("button", { name: /show less/i })).toBeInTheDocument();
  });

  it("clicking Show less collapses back and restores Read more", () => {
    mockScrollHeight(200);

    render(<ExpandableText text={"A very long text ".repeat(50)} />);
    const btn = screen.getByRole("button", { name: /read more/i });
    fireEvent.click(btn); // expand
    fireEvent.click(screen.getByRole("button", { name: /show less/i })); // collapse
    expect(screen.getByRole("button", { name: /read more/i })).toBeInTheDocument();
  });

  it("uses the default of 4 lines when no lines prop is given", () => {
    mockScrollHeight(200);
    const { container } = render(<ExpandableText text={"Long ".repeat(100)} />);
    const p = container.querySelector("p");
    expect(p?.className).toMatch(/line-clamp-4/);
  });

  it("respects a custom lines prop", () => {
    mockScrollHeight(200);
    const { container } = render(<ExpandableText text={"Long ".repeat(100)} lines={2} />);
    const p = container.querySelector("p");
    expect(p?.className).toMatch(/line-clamp-2/);
  });
});
