import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ReviewCard } from "@/components/review-card";

const baseProps = {
  body: "A great film with strong performances.",
  createdAt: "2024-01-15T00:00:00Z",
  authorInitial: "A",
  authorName: "Alice",
};

describe("ReviewCard", () => {
  it("renders the body text", () => {
    render(<ReviewCard {...baseProps} />);
    expect(screen.getByText("A great film with strong performances.")).toBeTruthy();
  });

  it("renders the author name", () => {
    render(<ReviewCard {...baseProps} />);
    expect(screen.getByText("Alice")).toBeTruthy();
  });

  it("renders the headline when provided", () => {
    render(<ReviewCard {...baseProps} headline="Masterpiece" />);
    expect(screen.getByText("Masterpiece")).toBeTruthy();
  });

  it("does not render a headline element when headline is not provided", () => {
    render(<ReviewCard {...baseProps} />);
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });

  it("does not render a headline element when headline is null", () => {
    render(<ReviewCard {...baseProps} headline={null} />);
    expect(screen.queryByRole("heading", { level: 3 })).toBeNull();
  });
});
