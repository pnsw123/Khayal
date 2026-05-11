import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { EmptyState } from "@/components/empty-state";

describe("EmptyState", () => {
  it("renders the title", () => {
    render(<EmptyState title="Nothing here." />);
    expect(screen.getByText("Nothing here.")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    render(<EmptyState title="Nothing here." subtitle="Try again later." />);
    expect(screen.getByText("Try again later.")).toBeTruthy();
  });

  it("renders arabicLabel when provided", () => {
    render(<EmptyState title="Nothing here." arabicLabel="لا خيال هنا" />);
    expect(screen.getByText("لا خيال هنا")).toBeTruthy();
  });

  it("does not render subtitle when omitted", () => {
    render(<EmptyState title="Nothing here." />);
    expect(screen.queryByText("Try again later.")).toBeNull();
  });
});
