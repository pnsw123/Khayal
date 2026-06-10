/**
 * Hand-crafted row types matching the Supabase schema for Khayal.
 *
 * These are derived from the SELECT columns used across the codebase.
 * Run `npx supabase gen types typescript --project-id iybfarqvntkkfxwbrxll`
 * to regenerate a full definition once an access token is available.
 */

// ── movies ──────────────────────────────────────────────────────────────────
export interface MovieRow {
  id: number;
  title: string;
  slug: string;
  release_date: string | null;
  poster_url: string | null;
}

// ── movies_with_genres (view) ────────────────────────────────────────────────
export interface MovieWithGenresRow {
  id: number;
  title: string;
  slug: string;
  release_date: string | null;
  runtime_minutes: number | null;
  age_rating: string | null;
  original_language: string | null;
  poster_url: string | null;
  genre_names: string[] | null;
}

// ── movie_credits ────────────────────────────────────────────────────────────
export interface MovieCreditRow {
  person_id: number;
  role: "cast" | "crew";
  character_name: string | null;
  job: string | null;
  credit_order: number;
  people: {
    name: string;
    profile_path: string | null;
  } | null;
}

// ── movie_ratings ────────────────────────────────────────────────────────────
export interface MovieRatingRow {
  rating: number;
  movies: {
    title: string;
    slug: string;
    poster_url: string | null;
    release_date: string | null;
  };
}

export interface UserMovieRatingRow {
  rating: number;
  created_at: string;
  movies: {
    title: string;
    slug: string;
    poster_url: string | null;
  } | null;
}

// ── movie_reviews ────────────────────────────────────────────────────────────
export interface MovieReviewAdminRow {
  id: number;
  headline: string | null;
  body: string;
  created_at: string;
  profiles: { username: string | null } | null;
  movies: { title: string; slug: string } | null;
}

export interface MovieReviewWithTarget {
  id: number;
  headline: string | null;
  created_at: string;
  movies: { title: string; slug: string; poster_url: string | null } | null;
}

// ── tv_series ────────────────────────────────────────────────────────────────
export interface TvSeriesRow {
  id: number;
  title: string;
  slug: string;
  first_air_date: string | null;
  poster_url: string | null;
}

// ── tv_series_reviews ────────────────────────────────────────────────────────
export interface TvSeriesReviewAdminRow {
  id: number;
  headline: string | null;
  body: string;
  created_at: string;
  profiles: { username: string | null } | null;
  tv_series: { title: string; slug: string } | null;
}

export interface TvSeriesReviewWithTarget {
  id: number;
  headline: string | null;
  created_at: string;
  tv_series: { title: string; slug: string; poster_url: string | null } | null;
}

// ── user_lists ───────────────────────────────────────────────────────────────
export interface UserListRow {
  id: number;
  name: string;
  is_public: boolean;
  is_favorites: boolean;
  created_at: string;
}

// ── user_list_movies (join with movies) ──────────────────────────────────────
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

// ── user_list_tv_series (join with tv_series) ─────────────────────────────────
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

// ── profiles ─────────────────────────────────────────────────────────────────
export interface ProfileRow {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string | null;
}

// ── movie_stats (view) ───────────────────────────────────────────────────────
export interface MovieStatRow {
  movie_id: number;
  avg_rating: number | null;
}
