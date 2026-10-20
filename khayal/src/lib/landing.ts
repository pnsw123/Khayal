import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/** How many posters the homepage wall shows. */
export const POSTER_LIMIT = 30;

export interface LandingPoster {
  id: number;
  title: string;
  slug: string;
  year: string | null;
  posterUrl: string;
}

export interface LandingCounts {
  films: number;
  series: number;
  people: number;
}

export interface LandingBackdrop {
  url: string;
  title: string;
}

/** A hero slide: a popular film that has a wide backdrop. */
export interface LandingFeatured {
  id: number;
  title: string;
  slug: string;
  year: string | null;
  overview: string | null;
  runtime: number | null;
  ageRating: string | null;
  backdropUrl: string;
}

/** How many hero slides the homepage carousel shows. */
export const FEATURED_LIMIT = 5;

export interface LandingData {
  posters: LandingPoster[];
  featured: LandingFeatured[];
  counts: LandingCounts;
  backdrop: LandingBackdrop | null;
}

type Client = SupabaseClient<Database>;

/**
 * Everything the homepage needs below the hero, in one round of queries.
 *
 * Posters = most popular films (TMDB popularity) that have a poster and a slug.
 * Featured = up to FEATURED_LIMIT of those that also have a backdrop (hero slides).
 * Backdrop = first of those that also has a backdrop image.
 */
export async function getLandingData(sb: Client): Promise<LandingData> {
  const [postersRes, filmsRes, seriesRes, peopleRes] = await Promise.all([
    sb
      .from("movies")
      .select("id, title, slug, release_date, poster_url, backdrop_url, overview, runtime_minutes, age_rating")
      .not("poster_url", "is", null)
      .not("slug", "is", null)
      .order("popularity", { ascending: false, nullsFirst: false })
      .limit(POSTER_LIMIT),
    sb.from("movies").select("*", { count: "exact", head: true }),
    sb.from("tv_series").select("*", { count: "exact", head: true }),
    sb.from("people").select("*", { count: "exact", head: true }),
  ]);

  const rows = postersRes.data ?? [];

  const posters: LandingPoster[] = rows.flatMap((r) =>
    r.slug && r.poster_url
      ? [
          {
            id: r.id,
            title: r.title,
            slug: r.slug,
            year: r.release_date ? r.release_date.slice(0, 4) : null,
            posterUrl: r.poster_url,
          },
        ]
      : []
  );

  const withBackdrop = rows.find((r) => r.backdrop_url);

  const featured: LandingFeatured[] = rows
    .flatMap((r) =>
      r.slug && r.backdrop_url
        ? [
            {
              id: r.id,
              title: r.title,
              slug: r.slug,
              year: r.release_date ? r.release_date.slice(0, 4) : null,
              overview: r.overview ?? null,
              runtime: r.runtime_minutes ?? null,
              ageRating: r.age_rating ?? null,
              backdropUrl: r.backdrop_url,
            },
          ]
        : []
    )
    .slice(0, FEATURED_LIMIT);

  return {
    posters,
    featured,
    counts: {
      films: filmsRes.count ?? 0,
      series: seriesRes.count ?? 0,
      people: peopleRes.count ?? 0,
    },
    backdrop: withBackdrop?.backdrop_url
      ? { url: withBackdrop.backdrop_url, title: withBackdrop.title }
      : null,
  };
}
