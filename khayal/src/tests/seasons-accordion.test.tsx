import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeasonsAccordion, type Season } from "@/components/seasons-accordion";

const makeSeason = (n: number, overrides: Partial<Season> = {}): Season => ({
  id: n,
  season_number: n,
  name: `Season ${n}`,
  overview: `Overview for season ${n}`,
  air_date: `2020-0${n}-01`,
  episode_count: 10,
  poster_url: null,
  ...overrides,
});

describe("SeasonsAccordion", () => {
  it("renders nothing when seasons is empty", () => {
    const { container } = render(<SeasonsAccordion seasons={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders Seasons heading", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1)]} />);
    expect(screen.getByText("Seasons")).toBeInTheDocument();
  });

  it("renders Arabic label المواسم", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1)]} />);
    expect(screen.getByText("المواسم")).toBeInTheDocument();
  });

  it("renders season labels", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1), makeSeason(2)]} />);
    expect(screen.getByText("Season 1")).toBeInTheDocument();
    expect(screen.getByText("Season 2")).toBeInTheDocument();
  });

  it("shows season code S01 for season_number 1", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1)]} />);
    expect(screen.getByText("S01")).toBeInTheDocument();
  });

  it("shows SP for season 0 (specials)", () => {
    render(<SeasonsAccordion seasons={[makeSeason(0, { name: "Specials" })]} />);
    expect(screen.getByText("SP")).toBeInTheDocument();
  });

  it("places season 0 last in the sorted list", () => {
    render(<SeasonsAccordion seasons={[makeSeason(0), makeSeason(1), makeSeason(2)]} />);
    const buttons = screen.getAllByRole("button");
    // Last button should be specials (SP)
    expect(buttons[buttons.length - 1].textContent).toContain("SP");
  });

  it("expands season on click and shows overview", async () => {
    render(<SeasonsAccordion seasons={[makeSeason(1)]} />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(screen.getByText("Overview for season 1")).toBeInTheDocument();
  });

  it("collapses already-open season on second click", async () => {
    render(<SeasonsAccordion seasons={[makeSeason(1)]} />);
    const btn = screen.getByRole("button");
    await userEvent.click(btn);
    expect(screen.getByText("Overview for season 1")).toBeInTheDocument();
    await userEvent.click(btn);
    expect(screen.queryByText("Overview for season 1")).not.toBeInTheDocument();
  });

  it("shows episode count in header", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1, { episode_count: 8 })]} />);
    expect(screen.getByText(/8 ep/)).toBeInTheDocument();
  });

  it("shows air year in header", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1, { air_date: "2021-05-01" })]} />);
    expect(screen.getByText("2021")).toBeInTheDocument();
  });

  it("renders poster image when poster_url provided", async () => {
    render(<SeasonsAccordion seasons={[makeSeason(1, { poster_url: "https://example.com/s1.jpg" })]} />);
    await userEvent.click(screen.getByRole("button"));
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/s1.jpg");
  });

  it("shows 'No overview available' when overview is null", async () => {
    render(<SeasonsAccordion seasons={[makeSeason(1, { overview: null })]} />);
    await userEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/No overview available/i)).toBeInTheDocument();
  });

  it("displays season count in header", () => {
    render(<SeasonsAccordion seasons={[makeSeason(1), makeSeason(2), makeSeason(3)]} />);
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
