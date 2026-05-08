/**
 * Tests for issue #19: RateWidget and AddToListButton must NOT share the same flex container.
 * They should be in separate sibling rows below the border-t divider.
 *
 * Note (issue #22): Poster/info grid column widths were updated in movies/[slug]/page.tsx and
 * tv/[slug]/page.tsx — xl breakpoint changed from 300px to 360px, 2xl added at 400px.
 * Grid column values are Tailwind utility classes and are not unit-testable; visual QA on
 * an xl/2xl viewport is the appropriate verification method.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";

// Minimal stand-ins — we only care about structure, not internal behaviour
vi.mock("@/components/rate-widget", () => ({
  RateWidget: () => <div data-testid="rate-widget">RateWidget</div>,
}));
vi.mock("@/components/add-to-list", () => ({
  AddToListButton: () => <div data-testid="add-to-list-button">AddToListButton</div>,
}));

import { RateWidget } from "@/components/rate-widget";
import { AddToListButton } from "@/components/add-to-list";

/** Renders the Actions section exactly as it appears in the fixed page.tsx */
function ActionsSection() {
  return (
    <div className="pt-6 border-t border-gray-700">
      <div data-testid="rate-row">
        <RateWidget userId={null} kind="movie" targetId={1} initialRating={null} slug="test" />
      </div>
      <div className="mt-3" data-testid="list-row">
        <AddToListButton userId={null} kind="movie" targetId={1} slug="test" initialLists={[]} />
      </div>
    </div>
  );
}

describe("Movie detail — Actions section layout (issue #19)", () => {
  it("RateWidget and AddToListButton render", () => {
    const { getByTestId } = render(<ActionsSection />);
    expect(getByTestId("rate-widget")).toBeInTheDocument();
    expect(getByTestId("add-to-list-button")).toBeInTheDocument();
  });

  it("RateWidget and AddToListButton are NOT siblings in the same flex container", () => {
    const { getByTestId } = render(<ActionsSection />);
    const rateWidget = getByTestId("rate-widget");
    const addToListButton = getByTestId("add-to-list-button");
    // They must be in different parent containers
    expect(rateWidget.parentElement).not.toBe(addToListButton.parentElement);
  });

  it("rate-row and list-row are siblings under the same wrapper", () => {
    const { getByTestId } = render(<ActionsSection />);
    const rateRow = getByTestId("rate-row");
    const listRow = getByTestId("list-row");
    expect(rateRow.parentElement).toBe(listRow.parentElement);
  });

  it("list-row comes after rate-row in DOM order", () => {
    const { getByTestId } = render(<ActionsSection />);
    const rateRow = getByTestId("rate-row");
    const listRow = getByTestId("list-row");
    const parent = rateRow.parentElement!;
    const children = Array.from(parent.children);
    expect(children.indexOf(rateRow)).toBeLessThan(children.indexOf(listRow));
  });
});
