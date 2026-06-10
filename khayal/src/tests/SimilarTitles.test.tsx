import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { SimilarTitles } from "@/components/similar-titles";
import type { SimilarMovie, SimilarTv } from "@/lib/similar";

type MovieItem = SimilarMovie & { kind: "movie" };
type TvItem = SimilarTv & { kind: "tv" };

const movieItem: MovieItem = {
  id: 1,
  title: "Inception",
  slug: "inception",
  poster_url: "https://image.tmdb.org/t/p/w342/poster1.jpg",
  release_date: "2010-07-16",
  genre_names: ["Sci-Fi", "Thriller"],
  kind: "movie",
};

const tvItem: TvItem = {
  id: 2,
  title: "Breaking Bad",
  slug: "breaking-bad",
  poster_url: "https://image.tmdb.org/t/p/w342/poster2.jpg",
  first_air_date: "2008-01-20",
  genre_names: ["Drama", "Crime"],
  kind: "tv",
};

const movieNoPoster: MovieItem = {
  id: 3,
  title: "No Poster Film",
  slug: "no-poster-film",
  poster_url: null,
  release_date: "2020-01-01",
  genre_names: [],
  kind: "movie",
};

describe("SimilarTitles", () => {
  it("renders nothing when items array is empty", () => {
    const { container } = render(<SimilarTitles items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders poster images for items with poster_url", () => {
    render(<SimilarTitles items={[movieItem, tvItem]} />);
    const imgs = screen.getAllByRole("img");
    expect(imgs).toHaveLength(2);
    expect(imgs[0]).toHaveAttribute("src", movieItem.poster_url);
    expect(imgs[0]).toHaveAttribute("alt", movieItem.title);
    expect(imgs[1]).toHaveAttribute("src", tvItem.poster_url);
    expect(imgs[1]).toHaveAttribute("alt", tvItem.title);
  });

  it("renders title links with correct hrefs for movies", () => {
    render(<SimilarTitles items={[movieItem]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/movies/${movieItem.slug}`);
  });

  it("renders title links with correct hrefs for tv series", () => {
    render(<SimilarTitles items={[tvItem]} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/tv/${tvItem.slug}`);
  });

  it("handles null poster_url gracefully — shows Film icon fallback, no img element", () => {
    render(<SimilarTitles items={[movieNoPoster]} />);
    expect(screen.queryByRole("img")).toBeNull();
    // Link should still render
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", `/movies/${movieNoPoster.slug}`);
  });

  it("renders default heading when no heading prop supplied", () => {
    render(<SimilarTitles items={[movieItem]} />);
    expect(screen.getByText("You might also like")).toBeTruthy();
  });

  it("renders custom heading when heading prop is supplied", () => {
    render(<SimilarTitles items={[movieItem]} heading="Similar Films" />);
    expect(screen.getByText("Similar Films")).toBeTruthy();
  });

  it("renders all items when given a mixed array of movies and tv", () => {
    render(<SimilarTitles items={[movieItem, tvItem, movieNoPoster]} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
  });
});
