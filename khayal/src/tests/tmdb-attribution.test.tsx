import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { TmdbAttribution } from "@/components/tmdb-attribution";

describe("TmdbAttribution", () => {
  it("renders required TMDB attribution text", () => {
    render(<TmdbAttribution />);
    expect(
      screen.getByText(/This product uses the TMDB API but is not endorsed or certified by TMDB/i)
    ).toBeTruthy();
  });

  it("renders TMDB logo image", () => {
    render(<TmdbAttribution />);
    const logo = screen.getByAltText("TMDB logo");
    expect(logo).toBeTruthy();
    expect((logo as HTMLImageElement).src).toContain("tmdb-logo.svg");
  });

  it("renders link to themoviedb.org", () => {
    render(<TmdbAttribution />);
    const link = screen.getByTestId("tmdb-attribution-link");
    expect(link).toBeTruthy();
    expect((link as HTMLAnchorElement).href).toContain("themoviedb.org");
  });

  it("link opens in new tab", () => {
    render(<TmdbAttribution />);
    const link = screen.getByTestId("tmdb-attribution-link") as HTMLAnchorElement;
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
  });

  it("attribution text has correct data-testid", () => {
    render(<TmdbAttribution />);
    expect(screen.getByTestId("tmdb-attribution-text")).toBeTruthy();
  });
});
