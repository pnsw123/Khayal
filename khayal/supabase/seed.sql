-- seed.sql — Local development fixture data
--
-- Loaded automatically by `supabase start` / `supabase db reset`.
-- Contains minimal data to exercise browse, search, and detail pages
-- without needing a full TMDB sync.
--
-- NOT applied to production. Production data comes from the Python sync
-- pipeline in scripts/sync_movies.py.
--
-- Idempotent: ON CONFLICT DO NOTHING on all inserts.

-- ── Genres ───────────────────────────────────────────────────────────────────

INSERT INTO genres (id, name, slug, tmdb_id) VALUES
  (1,  'Action',      'action',      28),
  (2,  'Drama',       'drama',       18),
  (3,  'Comedy',      'comedy',      35),
  (4,  'Thriller',    'thriller',    53),
  (5,  'Science Fiction', 'science-fiction', 878),
  (6,  'Animation',   'animation',   16),
  (7,  'Crime',       'crime',       80),
  (8,  'Documentary', 'documentary', 99)
ON CONFLICT (id) DO NOTHING;

-- ── Movies ───────────────────────────────────────────────────────────────────

INSERT INTO movies (
  id, title, slug, release_date, runtime_minutes,
  age_rating, original_language, country,
  overview, poster_url, backdrop_url,
  tmdb_id, trailer_youtube_id, tagline, popularity
) VALUES
  (
    1,
    'Inception',
    'inception-2010',
    '2010-07-16',
    148,
    'PG-13',
    'en',
    'US',
    'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
    'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
    'https://image.tmdb.org/t/p/original/s3TBrRGB1iav7gFOCNx3H31MoES.jpg',
    27205,
    'YoHD9XEInc0',
    'Your mind is the scene of the crime.',
    95.5
  ),
  (
    2,
    'Parasite',
    'parasite-2019',
    '2019-05-30',
    132,
    'R',
    'ko',
    'KR',
    'All unemployed, Ki-taek and his family take peculiar interest in the wealthy and glamorous Park family and are very eager to be employed by them.',
    'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    'https://image.tmdb.org/t/p/original/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    496243,
    '5xH0HfJHsaY',
    'Act like you own the place.',
    88.3
  ),
  (
    3,
    'Spirited Away',
    'spirited-away-2001',
    '2001-07-20',
    125,
    'PG',
    'ja',
    'JP',
    'During her family''s move to the suburbs, a sulky 10-year-old girl wanders into a world ruled by gods, witches, and spirits where humans are changed into beasts.',
    'https://image.tmdb.org/t/p/w500/39wmItIWsg5sZMyRUHLkWBcuVCM.jpg',
    'https://image.tmdb.org/t/p/original/Ab8mkHmkYADjU7wQiOkia9BzGvS.jpg',
    129,
    'ByXuk9QqQkk',
    'The tunnel led Chihiro to a magical world.',
    82.1
  )
ON CONFLICT (id) DO NOTHING;

-- ── Movie ↔ Genre links ───────────────────────────────────────────────────────

INSERT INTO movie_genres (movie_id, genre_id) VALUES
  -- Inception: Action, Science Fiction, Thriller
  (1, 1), (1, 4), (1, 5),
  -- Parasite: Drama, Thriller, Crime
  (2, 2), (2, 4), (2, 7),
  -- Spirited Away: Animation
  (3, 6)
ON CONFLICT DO NOTHING;

-- ── TV Series ────────────────────────────────────────────────────────────────

INSERT INTO tv_series (
  id, title, slug, first_air_date, last_air_date,
  status, original_language,
  overview, poster_url, backdrop_url,
  tmdb_id, trailer_youtube_id, tagline, popularity
) VALUES
  (
    1,
    'Breaking Bad',
    'breaking-bad',
    '2008-01-20',
    '2013-09-29',
    'Ended',
    'en',
    'When chemistry teacher Walter White is diagnosed with Stage III cancer and given only two years to live, he partners with a former student named Jesse Pinkman to turn a failing chemistry teacher into a drug empire.',
    'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    'https://image.tmdb.org/t/p/original/tsRy63Mu5cu8etL1X7ZLyf7UP1M.jpg',
    1396,
    'HhesaQXLuRY',
    'Change the equation.',
    120.7
  )
ON CONFLICT (id) DO NOTHING;

-- ── TV Series ↔ Genre links ───────────────────────────────────────────────────

INSERT INTO tv_genres (tv_series_id, genre_id) VALUES
  -- Breaking Bad: Drama, Crime, Thriller
  (1, 2), (1, 4), (1, 7)
ON CONFLICT DO NOTHING;
