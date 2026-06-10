import { supabaseServer } from "@/lib/supabase-server";

export type SimilarMovie = {
  id: number;
  title: string;
  slug: string;
  poster_url: string | null;
  release_date: string | null;
  genre_names: string[];
};

export type SimilarTv = {
  id: number;
  title: string;
  slug: string;
  poster_url: string | null;
  first_air_date: string | null;
  genre_names: string[];
};

export async function getSimilarMovies(
  movieId: number,
  limit = 6,
): Promise<SimilarMovie[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("similar_movies", {
    p_movie_id: movieId,
    p_limit: limit,
  });
  if (error) {
    return [];
  }
  return (data ?? []) as SimilarMovie[];
}

export async function getSimilarTvSeries(
  tvSeriesId: number,
  limit = 6,
): Promise<SimilarTv[]> {
  const sb = await supabaseServer();
  const { data, error } = await sb.rpc("similar_tv_series", {
    p_tv_series_id: tvSeriesId,
    p_limit: limit,
  });
  if (error) {
    return [];
  }
  return (data ?? []) as SimilarTv[];
}
