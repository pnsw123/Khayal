import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Trailer } from "@/components/trailer";

describe("Trailer", () => {
  it("renders 'Find trailer' fallback link when no youtubeId", () => {
    render(<Trailer youtubeId={null} title="Inception" year="2010" />);
    expect(screen.getByText("Find trailer")).toBeInTheDocument();
  });

  it("fallback link is a YouTube search link", () => {
    render(<Trailer youtubeId={null} title="Inception" year="2010" />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", expect.stringContaining("youtube.com/results"));
    expect(link).toHaveAttribute("href", expect.stringContaining("Inception"));
  });

  it("fallback link opens in new tab", () => {
    render(<Trailer youtubeId={null} title="Inception" year="2010" />);
    expect(screen.getByRole("link")).toHaveAttribute("target", "_blank");
  });

  it("renders 'Watch trailer' button when youtubeId provided", () => {
    render(<Trailer youtubeId="abc123" title="Inception" year="2010" />);
    expect(screen.getByText("Watch trailer")).toBeInTheDocument();
  });

  it("does not render iframe before button click", () => {
    render(<Trailer youtubeId="abc123" title="Inception" year="2010" />);
    expect(screen.queryByTitle(/trailer/i)).not.toBeInTheDocument();
  });

  it("shows iframe after clicking Watch trailer", async () => {
    render(<Trailer youtubeId="abc123" title="Inception" year="2010" />);
    await userEvent.click(screen.getByText("Watch trailer"));
    const iframe = screen.getByTitle("Inception — trailer");
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute("src", expect.stringContaining("abc123"));
  });

  it("shows close button when iframe is open", async () => {
    render(<Trailer youtubeId="abc123" title="Inception" year="2010" />);
    await userEvent.click(screen.getByText("Watch trailer"));
    expect(screen.getByLabelText("Close trailer")).toBeInTheDocument();
  });

  it("closes iframe when close button clicked", async () => {
    render(<Trailer youtubeId="abc123" title="Inception" year="2010" />);
    await userEvent.click(screen.getByText("Watch trailer"));
    await userEvent.click(screen.getByLabelText("Close trailer"));
    expect(screen.queryByTitle(/trailer/i)).not.toBeInTheDocument();
    expect(screen.getByText("Watch trailer")).toBeInTheDocument();
  });

  it("accepts className prop without throwing", () => {
    expect(() =>
      render(<Trailer youtubeId="abc123" title="Film" year="2020" className="mt-4" />)
    ).not.toThrow();
  });

  it("handles null year in fallback link gracefully", () => {
    render(<Trailer youtubeId={null} title="Inception" year={null} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toContain("youtube.com");
  });
});
