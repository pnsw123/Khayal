-- Similar movies RPC: genre overlap count + release year proximity + rating
-- Genre storage: many-to-many via movie_genres(movie_id, genre_id) + genres(id, name)
-- No external embeddings — pure SQL scoring.

CREATE OR REPLACE FUNCTION similar_movies(
  p_movie_id bigint,
  p_limit    int DEFAULT 6
)
RETURNS TABLE (
  id              bigint,
  title           text,
  slug            text,
  poster_url      text,
  release_date    date,
  genre_names     text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (
    SELECT
      release_date,
      EXTRACT(YEAR FROM release_date)::int AS src_year
    FROM movies
    WHERE id = p_movie_id
  ),
  src_genres AS (
    SELECT genre_id FROM movie_genres WHERE movie_id = p_movie_id
  ),
  scored AS (
    SELECT
      m.id,
      m.title,
      m.slug,
      m.poster_url,
      m.release_date,
      -- genre overlap: count shared genres
      COUNT(mg.genre_id)                                                         AS genre_overlap,
      -- year proximity: 0 when same year, shrinks by 1 per decade
      GREATEST(0, 10 - ABS(
        COALESCE(EXTRACT(YEAR FROM m.release_date)::int, 0)
        - COALESCE((SELECT src_year FROM src), 0)
      ))                                                                         AS year_score
    FROM movies m
    LEFT JOIN movie_genres mg
      ON mg.movie_id = m.id AND mg.genre_id IN (SELECT genre_id FROM src_genres)
    WHERE m.id != p_movie_id
      AND m.poster_url IS NOT NULL
    GROUP BY m.id, m.title, m.slug, m.poster_url, m.release_date
  )
  SELECT
    s.id,
    s.title,
    s.slug,
    s.poster_url,
    s.release_date,
    COALESCE(
      ARRAY_AGG(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL),
      ARRAY[]::text[]
    ) AS genre_names
  FROM scored s
  LEFT JOIN movie_genres mg2 ON mg2.movie_id = s.id
  LEFT JOIN genres g ON g.id = mg2.genre_id
  GROUP BY s.id, s.title, s.slug, s.poster_url, s.release_date,
           s.genre_overlap, s.year_score
  ORDER BY
    s.genre_overlap DESC,
    s.year_score    DESC,
    s.id            DESC
  LIMIT p_limit;
$$;

-- Similar TV series RPC: same pattern for tv_series / tv_genres tables
CREATE OR REPLACE FUNCTION similar_tv_series(
  p_tv_series_id bigint,
  p_limit        int DEFAULT 6
)
RETURNS TABLE (
  id              bigint,
  title           text,
  slug            text,
  poster_url      text,
  first_air_date  date,
  genre_names     text[]
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src AS (
    SELECT
      first_air_date,
      EXTRACT(YEAR FROM first_air_date)::int AS src_year
    FROM tv_series
    WHERE id = p_tv_series_id
  ),
  src_genres AS (
    SELECT genre_id FROM tv_genres WHERE tv_series_id = p_tv_series_id
  ),
  scored AS (
    SELECT
      s.id,
      s.title,
      s.slug,
      s.poster_url,
      s.first_air_date,
      COUNT(tg.genre_id)                                                         AS genre_overlap,
      GREATEST(0, 10 - ABS(
        COALESCE(EXTRACT(YEAR FROM s.first_air_date)::int, 0)
        - COALESCE((SELECT src_year FROM src), 0)
      ))                                                                         AS year_score
    FROM tv_series s
    LEFT JOIN tv_genres tg
      ON tg.tv_series_id = s.id AND tg.genre_id IN (SELECT genre_id FROM src_genres)
    WHERE s.id != p_tv_series_id
      AND s.poster_url IS NOT NULL
    GROUP BY s.id, s.title, s.slug, s.poster_url, s.first_air_date
  )
  SELECT
    sc.id,
    sc.title,
    sc.slug,
    sc.poster_url,
    sc.first_air_date,
    COALESCE(
      ARRAY_AGG(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL),
      ARRAY[]::text[]
    ) AS genre_names
  FROM scored sc
  LEFT JOIN tv_genres tg2 ON tg2.tv_series_id = sc.id
  LEFT JOIN genres g ON g.id = tg2.genre_id
  GROUP BY sc.id, sc.title, sc.slug, sc.poster_url, sc.first_air_date,
           sc.genre_overlap, sc.year_score
  ORDER BY
    sc.genre_overlap DESC,
    sc.year_score    DESC,
    sc.id            DESC
  LIMIT p_limit;
$$;
