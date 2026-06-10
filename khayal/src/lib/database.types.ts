/**
 * Hand-maintained database type extensions for Khayal.
 *
 * Re-exports all generated types from database.types.generated.ts (the file
 * that supabase gen types writes to) so consumers can import from one place.
 *
 * Hand-authored sections here:
 *  - Convenience row-type aliases (Tables<T>, Views<T> helpers + named aliases)
 *  - Query-result shapes for specific JOIN / RPC call signatures
 *
 * To update generated types, run:
 *   npx supabase gen types typescript --project-id iybfarqvntkkfxwbrxll \
 *     --schema public > src/lib/database.types.generated.ts
 * The gen-types CI workflow does this automatically on push to main.
 */

export type { Json, Database } from "./database.types.generated";
import type { Database } from "./database.types.generated";

// ── Convenience row-type aliases ─────────────────────────────────────────────

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type Views<T extends keyof Database["public"]["Views"]> =
  Database["public"]["Views"][T]["Row"];

// Table row aliases
export type MovieRow = Tables<"movies">;
export type TvSeriesRow = Tables<"tv_series">;
export type ProfileRow = Tables<"profiles">;
export type GenreRow = Tables<"genres">;
export type MovieCreditRow = Tables<"movie_credits">;
export type TvCreditRow = Tables<"tv_credits">;
export type MovieRatingRow = Tables<"movie_ratings">;
export type TvSeriesRatingRow = Tables<"tv_series_ratings">;
export type MovieReviewRow = Tables<"movie_reviews">;
export type TvSeriesReviewRow = Tables<"tv_series_reviews">;
export type UserListRow = Tables<"user_lists">;
export type UserListMovieRow = Tables<"user_list_movies">;
export type UserListTvSeriesRow = Tables<"user_list_tv_series">;
export type PersonRow = Tables<"people">;
export type RecommendationRow = Tables<"recommendations">;
export type SeasonRow = Tables<"seasons">;
export type WatchProviderRow = Tables<"watch_providers">;

// View row aliases
export type MovieWithGenresRow = Views<"movies_with_genres">;
export type TvSeriesWithGenresRow = Views<"tv_series_with_genres">;
export type MovieStatRow = Views<"movie_stats">;
export type TvSeriesStatRow = Views<"tv_series_stats">;

// ── Query-result shapes (join / RPC results, not raw table rows) ─────────────
// These represent the shapes of specific SELECT queries that join related tables.
// They are NOT Supabase generated — they are hand-matched to the actual SQL the
// app sends, so they will fail TypeScript compilation if they drift from the query.

/**
 * Result of: movie_credits + people join.
 * Used in movie detail page cast section.
 */
export interface MovieCreditWithPeopleRow {
  person_id: number;
  role: "cast" | "crew";
  character_name: string | null;
  job: string | null;
  credit_order: number | null;
  people: {
    name: string;
    profile_path: string | null;
  } | null;
}

/**
 * Result of: movie_reviews + profiles + movies join (admin list view).
 */
export interface MovieReviewAdminRow {
  id: number;
  headline: string | null;
  body: string;
  created_at: string;
  profiles: { username: string | null } | null;
  movies: { title: string; slug: string } | null;
}

/**
 * Result of: tv_series_reviews + profiles + tv_series join (admin list view).
 */
export interface TvSeriesReviewAdminRow {
  id: number;
  headline: string | null;
  body: string;
  created_at: string;
  profiles: { username: string | null } | null;
  tv_series: { title: string; slug: string } | null;
}

/**
 * Result of: movie_reviews + movies join (user profile recent reviews).
 */
export interface MovieReviewWithTarget {
  id: number;
  headline: string | null;
  created_at: string;
  movies: { title: string; slug: string; poster_url: string | null } | null;
}

/**
 * Result of: tv_series_reviews + tv_series join (user profile recent reviews).
 */
export interface TvSeriesReviewWithTarget {
  id: number;
  headline: string | null;
  created_at: string;
  tv_series: { title: string; slug: string; poster_url: string | null } | null;
}

/**
 * Result of: movie_ratings + movies join (user profile recent ratings).
 */
export interface UserMovieRatingRow {
  rating: number;
  created_at: string;
  movies: {
    title: string;
    slug: string;
    poster_url: string | null;
  } | null;
}

/**
 * Result of: user_list_movies + movies join (list detail page).
 */
export interface UserListMovieJoinRow {
  movie_id: number;
  added_at: string;
  movies: {
    id: number;
    title: string;
    slug: string;
    release_date: string | null;
    poster_url: string | null;
  };
}

/**
 * Result of: user_list_tv_series + tv_series join (list detail page).
 */
export interface UserListTvJoinRow {
  tv_series_id: number;
  added_at: string;
  tv_series: {
    id: number;
    title: string;
    slug: string;
    first_air_date: string | null;
    poster_url: string | null;
  };
}

/**
 * Result of: tv_credits + people join.
 * Used in TV series detail page cast section.
 */
export interface TvCreditWithPeopleRow {
  person_id: number;
  role: "cast" | "crew";
  character_name: string | null;
  job: string | null;
  credit_order: number | null;
  people: {
    name: string;
    profile_path: string | null;
  } | null;
}
