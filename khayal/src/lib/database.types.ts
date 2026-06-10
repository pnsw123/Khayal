/**
 * Auto-generated database types for Khayal.
 *
 * Generated from live schema via Supabase REST API introspection on 2026-06-10.
 * Regenerate with:
 *   npx supabase gen types typescript --project-id iybfarqvntkkfxwbrxll \
 *     --schema public > src/lib/database.types.ts
 *
 * Requires: SUPABASE_ACCESS_TOKEN env var (see GitHub secret SUPABASE_ACCESS_TOKEN).
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      genres: {
        Row: {
          id: number;
          name: string;
          slug: string;
          tmdb_id: number | null;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          tmdb_id?: number | null;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          tmdb_id?: number | null;
        };
        Relationships: [];
      };
      movie_credits: {
        Row: {
          id: number;
          movie_id: number;
          person_id: number;
          role: string;
          character_name: string | null;
          job: string | null;
          credit_order: number | null;
        };
        Insert: {
          id?: number;
          movie_id: number;
          person_id: number;
          role: string;
          character_name?: string | null;
          job?: string | null;
          credit_order?: number | null;
        };
        Update: {
          id?: number;
          movie_id?: number;
          person_id?: number;
          role?: string;
          character_name?: string | null;
          job?: string | null;
          credit_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "movie_credits_movie_id_fkey";
            columns: ["movie_id"];
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_credits_person_id_fkey";
            columns: ["person_id"];
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_genres: {
        Row: {
          movie_id: number;
          genre_id: number;
        };
        Insert: {
          movie_id: number;
          genre_id: number;
        };
        Update: {
          movie_id?: number;
          genre_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "movie_genres_genre_id_fkey";
            columns: ["genre_id"];
            referencedRelation: "genres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_genres_movie_id_fkey";
            columns: ["movie_id"];
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_ratings: {
        Row: {
          user_id: string;
          movie_id: number;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          movie_id: number;
          rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          movie_id?: number;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_ratings_movie_id_fkey";
            columns: ["movie_id"];
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_ratings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      movie_reviews: {
        Row: {
          id: number;
          user_id: string;
          movie_id: number;
          headline: string | null;
          body: string;
          contains_spoiler: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          movie_id: number;
          headline?: string | null;
          body: string;
          contains_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          movie_id?: number;
          headline?: string | null;
          body?: string;
          contains_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "movie_reviews_movie_id_fkey";
            columns: ["movie_id"];
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "movie_reviews_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      movies: {
        Row: {
          id: number;
          title: string;
          slug: string | null;
          release_date: string | null;
          runtime_minutes: number | null;
          age_rating: string | null;
          original_language: string | null;
          country: string | null;
          overview: string | null;
          poster_url: string | null;
          backdrop_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          tmdb_id: number | null;
          trailer_youtube_id: string | null;
          tagline: string | null;
          budget: number | null;
          revenue: number | null;
          popularity: number | null;
        };
        Insert: {
          id?: number;
          title: string;
          slug?: string | null;
          release_date?: string | null;
          runtime_minutes?: number | null;
          age_rating?: string | null;
          original_language?: string | null;
          country?: string | null;
          overview?: string | null;
          poster_url?: string | null;
          backdrop_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          tmdb_id?: number | null;
          trailer_youtube_id?: string | null;
          tagline?: string | null;
          budget?: number | null;
          revenue?: number | null;
          popularity?: number | null;
        };
        Update: {
          id?: number;
          title?: string;
          slug?: string | null;
          release_date?: string | null;
          runtime_minutes?: number | null;
          age_rating?: string | null;
          original_language?: string | null;
          country?: string | null;
          overview?: string | null;
          poster_url?: string | null;
          backdrop_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          tmdb_id?: number | null;
          trailer_youtube_id?: string | null;
          tagline?: string | null;
          budget?: number | null;
          revenue?: number | null;
          popularity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "movies_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      people: {
        Row: {
          id: number;
          name: string;
          slug: string;
          tmdb_id: number | null;
          profile_path: string | null;
          biography: string | null;
          birthday: string | null;
          known_for_department: string | null;
        };
        Insert: {
          id?: number;
          name: string;
          slug: string;
          tmdb_id?: number | null;
          profile_path?: string | null;
          biography?: string | null;
          birthday?: string | null;
          known_for_department?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          slug?: string;
          tmdb_id?: number | null;
          profile_path?: string | null;
          biography?: string | null;
          birthday?: string | null;
          known_for_department?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          email: string | null;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recommendations: {
        Row: {
          id: number;
          user_id: string;
          movie_id: number | null;
          tv_series_id: number | null;
          score: number | null;
          source: string;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          movie_id?: number | null;
          tv_series_id?: number | null;
          score?: number | null;
          source: string;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          movie_id?: number | null;
          tv_series_id?: number | null;
          score?: number | null;
          source?: string;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recommendations_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      saved_queries: {
        Row: {
          id: number;
          user_id: string | null;
          title: string;
          query_text: string;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          title: string;
          query_text: string;
          is_default?: boolean;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          title?: string;
          query_text?: string;
          is_default?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "saved_queries_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          id: number;
          tv_series_id: number;
          season_number: number;
          name: string | null;
          overview: string | null;
          air_date: string | null;
          episode_count: number | null;
          poster_url: string | null;
          tmdb_season_id: number | null;
        };
        Insert: {
          id?: number;
          tv_series_id: number;
          season_number: number;
          name?: string | null;
          overview?: string | null;
          air_date?: string | null;
          episode_count?: number | null;
          poster_url?: string | null;
          tmdb_season_id?: number | null;
        };
        Update: {
          id?: number;
          tv_series_id?: number;
          season_number?: number;
          name?: string | null;
          overview?: string | null;
          air_date?: string | null;
          episode_count?: number | null;
          poster_url?: string | null;
          tmdb_season_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "seasons_tv_series_id_fkey";
            columns: ["tv_series_id"];
            referencedRelation: "tv_series";
            referencedColumns: ["id"];
          },
        ];
      };
      tv_credits: {
        Row: {
          id: number;
          tv_series_id: number;
          person_id: number;
          role: string;
          character_name: string | null;
          job: string | null;
          credit_order: number | null;
        };
        Insert: {
          id?: number;
          tv_series_id: number;
          person_id: number;
          role: string;
          character_name?: string | null;
          job?: string | null;
          credit_order?: number | null;
        };
        Update: {
          id?: number;
          tv_series_id?: number;
          person_id?: number;
          role?: string;
          character_name?: string | null;
          job?: string | null;
          credit_order?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tv_credits_person_id_fkey";
            columns: ["person_id"];
            referencedRelation: "people";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tv_credits_tv_series_id_fkey";
            columns: ["tv_series_id"];
            referencedRelation: "tv_series";
            referencedColumns: ["id"];
          },
        ];
      };
      tv_genres: {
        Row: {
          tv_series_id: number;
          genre_id: number;
        };
        Insert: {
          tv_series_id: number;
          genre_id: number;
        };
        Update: {
          tv_series_id?: number;
          genre_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tv_genres_genre_id_fkey";
            columns: ["genre_id"];
            referencedRelation: "genres";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tv_genres_tv_series_id_fkey";
            columns: ["tv_series_id"];
            referencedRelation: "tv_series";
            referencedColumns: ["id"];
          },
        ];
      };
      tv_series: {
        Row: {
          id: number;
          title: string;
          slug: string | null;
          first_air_date: string | null;
          last_air_date: string | null;
          status: string | null;
          overview: string | null;
          poster_url: string | null;
          backdrop_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          tmdb_id: number | null;
          trailer_youtube_id: string | null;
          tagline: string | null;
          popularity: number | null;
        };
        Insert: {
          id?: number;
          title: string;
          slug?: string | null;
          first_air_date?: string | null;
          last_air_date?: string | null;
          status?: string | null;
          overview?: string | null;
          poster_url?: string | null;
          backdrop_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          tmdb_id?: number | null;
          trailer_youtube_id?: string | null;
          tagline?: string | null;
          popularity?: number | null;
        };
        Update: {
          id?: number;
          title?: string;
          slug?: string | null;
          first_air_date?: string | null;
          last_air_date?: string | null;
          status?: string | null;
          overview?: string | null;
          poster_url?: string | null;
          backdrop_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
          tmdb_id?: number | null;
          trailer_youtube_id?: string | null;
          tagline?: string | null;
          popularity?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "tv_series_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tv_series_ratings: {
        Row: {
          user_id: string;
          tv_series_id: number;
          rating: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          tv_series_id: number;
          rating: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          tv_series_id?: number;
          rating?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tv_series_ratings_tv_series_id_fkey";
            columns: ["tv_series_id"];
            referencedRelation: "tv_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tv_series_ratings_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      tv_series_reviews: {
        Row: {
          id: number;
          user_id: string;
          tv_series_id: number;
          headline: string | null;
          body: string;
          contains_spoiler: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          tv_series_id: number;
          headline?: string | null;
          body: string;
          contains_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          tv_series_id?: number;
          headline?: string | null;
          body?: string;
          contains_spoiler?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tv_series_reviews_tv_series_id_fkey";
            columns: ["tv_series_id"];
            referencedRelation: "tv_series";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tv_series_reviews_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      user_list_movies: {
        Row: {
          list_id: number;
          movie_id: number;
          added_at: string;
        };
        Insert: {
          list_id: number;
          movie_id: number;
          added_at?: string;
        };
        Update: {
          list_id?: number;
          movie_id?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_list_movies_list_id_fkey";
            columns: ["list_id"];
            referencedRelation: "user_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_list_movies_movie_id_fkey";
            columns: ["movie_id"];
            referencedRelation: "movies";
            referencedColumns: ["id"];
          },
        ];
      };
      user_list_tv_series: {
        Row: {
          list_id: number;
          tv_series_id: number;
          added_at: string;
        };
        Insert: {
          list_id: number;
          tv_series_id: number;
          added_at?: string;
        };
        Update: {
          list_id?: number;
          tv_series_id?: number;
          added_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_list_tv_series_list_id_fkey";
            columns: ["list_id"];
            referencedRelation: "user_lists";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_list_tv_series_tv_series_id_fkey";
            columns: ["tv_series_id"];
            referencedRelation: "tv_series";
            referencedColumns: ["id"];
          },
        ];
      };
      user_lists: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          description: string | null;
          is_public: boolean;
          is_favorites: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          name: string;
          description?: string | null;
          is_public?: boolean;
          is_favorites?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          name?: string;
          description?: string | null;
          is_public?: boolean;
          is_favorites?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_lists_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      watch_providers: {
        Row: {
          id: number;
          movie_id: number | null;
          tv_series_id: number | null;
          provider_name: string;
          provider_logo_url: string | null;
          country_code: string;
          link: string | null;
        };
        Insert: {
          id?: number;
          movie_id?: number | null;
          tv_series_id?: number | null;
          provider_name: string;
          provider_logo_url?: string | null;
          country_code: string;
          link?: string | null;
        };
        Update: {
          id?: number;
          movie_id?: number | null;
          tv_series_id?: number | null;
          provider_name?: string;
          provider_logo_url?: string | null;
          country_code?: string;
          link?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      movie_stats: {
        Row: {
          movie_id: number | null;
          avg_rating: number | null;
          total_ratings: number | null;
          total_reviews: number | null;
        };
        Relationships: [];
      };
      movies_with_genres: {
        Row: {
          id: number | null;
          title: string | null;
          slug: string | null;
          release_date: string | null;
          runtime_minutes: number | null;
          age_rating: string | null;
          original_language: string | null;
          country: string | null;
          overview: string | null;
          poster_url: string | null;
          backdrop_url: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
          tmdb_id: number | null;
          trailer_youtube_id: string | null;
          tagline: string | null;
          budget: number | null;
          revenue: number | null;
          popularity: number | null;
          genre_names: string[] | null;
        };
        Relationships: [];
      };
      tv_series_stats: {
        Row: {
          tv_series_id: number | null;
          avg_rating: number | null;
          total_ratings: number | null;
          total_reviews: number | null;
        };
        Relationships: [];
      };
      tv_series_with_genres: {
        Row: {
          id: number | null;
          title: string | null;
          slug: string | null;
          first_air_date: string | null;
          last_air_date: string | null;
          status: string | null;
          overview: string | null;
          poster_url: string | null;
          backdrop_url: string | null;
          created_by: string | null;
          created_at: string | null;
          updated_at: string | null;
          tmdb_id: number | null;
          trailer_youtube_id: string | null;
          tagline: string | null;
          popularity: number | null;
          genre_names: string[] | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      generate_recommendations: {
        Args: {
          p_user_id: string;
        };
        Returns: undefined;
      };
      get_movie_detail: {
        Args: {
          movie_slug: string;
          requesting_user_id?: string;
        };
        Returns: Json;
      };
      get_tv_detail: {
        Args: {
          series_slug: string;
          requesting_user_id?: string;
        };
        Returns: Json;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      run_query: {
        Args: {
          query_text: string;
        };
        Returns: Json;
      };
      search_all: {
        Args: {
          query_text: string;
          page_size?: number;
          page_offset?: number;
        };
        Returns: {
          id: number;
          type: string;
          title: string;
          slug: string;
          overview: string | null;
          poster_url: string | null;
          release_year: number | null;
          relevance: number;
        }[];
      };
      search_movies: {
        Args: {
          query_text: string;
          page_size?: number;
          page_offset?: number;
        };
        Returns: {
          id: number;
          title: string;
          slug: string;
          overview: string | null;
          poster_url: string | null;
          release_year: number | null;
          relevance: number;
        }[];
      };
      search_tv_series: {
        Args: {
          query_text: string;
          page_size?: number;
          page_offset?: number;
        };
        Returns: {
          id: number;
          title: string;
          slug: string;
          overview: string | null;
          poster_url: string | null;
          release_year: number | null;
          relevance: number;
        }[];
      };
      similar_movies: {
        Args: {
          p_movie_id: number;
          p_limit?: number;
        };
        Returns: {
          id: number;
          title: string;
          slug: string;
          poster_url: string | null;
          release_date: string | null;
          genre_names: string[];
        }[];
      };
      similar_tv_series: {
        Args: {
          p_tv_series_id: number;
          p_limit?: number;
        };
        Returns: {
          id: number;
          title: string;
          slug: string;
          poster_url: string | null;
          first_air_date: string | null;
          genre_names: string[];
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

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
