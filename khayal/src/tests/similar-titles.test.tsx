import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { SimilarTitles } from "@/components/similar-titles";
import type { SimilarMovie, SimilarTv } from "@/lib/similar";

type MovieItem = SimilarMovie & { kind: "movie" };
type TvItem = SimilarTv & { kind: "tv" };

const MOVIE_ITEMS: MovieItem[] = [
  {
    kind: "movie",
    id: 1,
    slug: "film-a",
    title: "Film A",
    poster_url: "https://example.com/a.jpg",
    release_date: "2023-01-15",
    genre_names: ["Drama"],
  },
  {
    kind: "movie",
    id: 2,
    slug: "film-b",
    title: "Film B",
    poster_url: null,
    release_date: null,
    genre_names: [],
  },
];

const TV_ITEMS: TvItem[] = [
  {
    kind: "tv",
    id: 10,
    slug: "show-x",
    title: "Show X",
    poster_url: "https://example.com/x.jpg",
    first_air_date: "2022-09-01",
    genre_names: ["Thriller"],
  },
];

describe("SimilarTitles", () => {
  it("renders nothing when items array is empty", () => {
    const { container } = render(<SimilarTitles items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders default heading when not provided", () => {
    render(<SimilarTitles items={MOVIE_ITEMS} />);
    expect(screen.getByText("You might also like")).toBeInTheDocument();
  });

  it("renders custom heading when provided", () => {
    render(<SimilarTitles heading="More Like This" items={MOVIE_ITEMS} />);
    expect(screen.getByText("More Like This")).toBeInTheDocument();
  });

  it("renders correct number of items", () => {
    render(<SimilarTitles items={MOVIE_ITEMS} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(MOVIE_ITEMS.length);
  });

  it("movie item links to /movies/[slug]", () => {
    render(<SimilarTitles items={[MOVIE_ITEMS[0]]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/movies/film-a");
  });

  it("tv item links to /tv/[slug]", () => {
    render(<SimilarTitles items={TV_ITEMS} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/tv/show-x");
  });

  it("renders poster image when poster_url provided", () => {
    render(<SimilarTitles items={[MOVIE_ITEMS[0]]} />);
    const img = screen.getByRole("img", { name: "Film A" });
    expect(img).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("renders fallback icon when poster_url is null", () => {
    render(<SimilarTitles items={[MOVIE_ITEMS[1]]} />);
    expect(screen.queryByRole("img")).toBeNull();
    // Film icon rendered via lucide — no img tag present
  });

  it("renders mixed movie and tv items", () => {
    const mixed = [...MOVIE_ITEMS, ...TV_ITEMS];
    render(<SimilarTitles items={mixed} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(mixed.length);
  });
});
