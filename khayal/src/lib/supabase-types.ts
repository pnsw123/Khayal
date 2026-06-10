// ─── Shared types only — no runtime/client-specific imports here ──────────
// The actual clients live in supabase-browser.ts and supabase-server.ts
// so that client components never accidentally import next/headers.

export type Movie = {
  id: number;
  title: string;
  slug: string;
  release_date: string | null;
  runtime_minutes: number | null;
  age_rating: string | null;
  original_language: string | null;
  country: string | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  trailer_youtube_id: string | null;
  relevance?: number;
  /** Present when queried from the movies_with_genres view. */
  genre_names?: string[] | null;
};

export type TvSeries = {
  id: number;
  title: string;
  slug: string;
  first_air_date: string | null;
  last_air_date: string | null;
  status: string | null;
  overview: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  tmdb_id: number | null;
  trailer_youtube_id: string | null;
  relevance?: number;
};

export type SearchAllRow = {
  id: number;
  type: "movie" | "tv";
  title: string;
  slug: string;
  overview: string | null;
  poster_url: string | null;
  release_year: number | null;
  relevance: number;
};

export type MovieStats = {
  movie_id: number;
  avg_rating: number | null;
  total_ratings: number;
  total_reviews: number;
};

export type Review = {
  id: number;
  headline: string | null;
  body: string;
  contains_spoiler: boolean;
  created_at: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type MovieDetail = {
  movie: Movie;
  stats: MovieStats | null;
  reviews: Review[];
};

export type TvDetail = {
  tv_series: TvSeries;
  stats: { tv_series_id: number; avg_rating: number | null; total_ratings: number; total_reviews: number } | null;
  reviews: Review[];
};

// Clients intentionally NOT re-exported here.
// Import them explicitly from supabase-browser or supabase-server.
