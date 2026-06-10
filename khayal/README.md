<div align="center">

# KHAYAL · خيال

**A cinematic discovery platform — 7,400+ films · 2,800+ TV shows**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-movie--db--one--psi.vercel.app-black?style=for-the-badge&logo=vercel)](https://movie-db-one-psi.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org)
[![Framer Motion](https://img.shields.io/badge/Framer%20Motion-animations-EF4D94?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

[![CI](https://github.com/pnsw123/Khayal/actions/workflows/ci.yml/badge.svg)](https://github.com/pnsw123/Khayal/actions/workflows/ci.yml)
[![Daily Sync](https://github.com/pnsw123/Khayal/actions/workflows/daily-sync.yml/badge.svg)](https://github.com/pnsw123/Khayal/actions/workflows/daily-sync.yml)
[![Load Tests](https://github.com/pnsw123/Khayal/actions/workflows/load-tests.yml/badge.svg)](https://github.com/pnsw123/Khayal/actions/workflows/load-tests.yml)
[![Gen Types](https://github.com/pnsw123/Khayal/actions/workflows/gen-types.yml/badge.svg)](https://github.com/pnsw123/Khayal/actions/workflows/gen-types.yml)

</div>

---

## Screenshots

| Browse | Detail | Search | Recommendations |
|--------|--------|--------|-----------------|
| [![Browse](docs/screenshots/browse.png)](https://movie-db-one-psi.vercel.app/browse) | [![Detail](docs/screenshots/detail.png)](https://movie-db-one-psi.vercel.app/movies/inception-2010) | [![Search](docs/screenshots/search.png)](https://movie-db-one-psi.vercel.app/search) | [![Recommendations](docs/screenshots/recommendations.png)](https://movie-db-one-psi.vercel.app/profile) |

**[Open live demo](https://movie-db-one-psi.vercel.app)**

---

## Demo

| Feature | What to try | URL |
|---------|-------------|-----|
| Browse | Scroll the catalogue, filter by genre | [/browse](https://movie-db-one-psi.vercel.app/browse) |
| Search | Type any title or actor name | [/search](https://movie-db-one-psi.vercel.app/search) |
| Rate | Click a title → rate it 1–10 | any title page |
| Recommendations | Rate 5+ films first — recommendations cold-start after your 5th rating | [/browse](https://movie-db-one-psi.vercel.app/browse) |
| Reviews | Write a review with optional spoiler blur | any title page |
| Watchlist | Add titles to a custom list | any title page |

> **Note:** Poster and backdrop images are served via the TMDB image CDN (`image.tmdb.org`). If TMDB's CDN is unreachable in your region, images will not load — the rest of the app remains functional. This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## What It Does

Browse, search, and track films and TV shows from a curated database of 7,400+ films and 2,800+ TV shows synced nightly from TMDB. Rate titles on a 10-point scale, write reviews with optional spoiler blur, build watchlists, and get personalised recommendations based on your rating history.

---

## Features

- Instant search — full-text RPC across 10,200+ titles with live dropdown
- Personalised recommendations — collaborative filtering via scikit-surprise / cornac, retrained daily
- Watchlists — add films and shows to custom lists, mark favourites
- 10-point rating system — per-user ratings, aggregated into per-title averages
- Reviews with spoiler toggle — headline + body; readers can hide spoilers
- Daily TMDB sync — GitHub Actions cron keeps the catalogue fresh
- Admin panel — content moderation and user role management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.9, React 19, TypeScript 5 (strict mode) |
| Styling | Tailwind CSS v4, CSS custom properties |
| UI Components | ReactBits, Radix UI primitives |
| Animation | Three.js, Framer Motion, Embla Carousel |
| Database | Supabase (PostgreSQL) — RLS, RPC functions, materialised views |
| Auth | Supabase Auth (email + OAuth) |
| Data sync | Python / TMDB API → Supabase (GitHub Actions daily cron) |
| ML | scikit-surprise, cornac — personalised recommendations |
| Deployment | Vercel |

---

## Database Schema

Supabase PostgreSQL. All tables live in the `public` schema with Row-Level Security (RLS) enabled.
Authoritative types: [`src/lib/database.types.generated.ts`](src/lib/database.types.generated.ts).

> **Setup:** apply all files in `supabase/migrations/` with `supabase db reset` (local CLI) or paste the SQL into the Supabase dashboard SQL editor (cloud). See [CONTRIBUTING.md](CONTRIBUTING.md) for full step-by-step instructions.

### Core tables

| Table | Purpose | Key columns |
|---|---|---|
| `movies` | Film catalogue (7 400+ titles) | `id`, `title`, `slug`, `release_date`, `runtime_minutes`, `age_rating`, `tmdb_id`, `popularity` |
| `tv_series` | TV show catalogue (2 800+ titles) | `id`, `title`, `slug`, `first_air_date`, `last_air_date`, `status`, `tmdb_id`, `popularity` |
| `genres` | Genre lookup | `id`, `name`, `slug`, `tmdb_id` |
| `people` | Cast & crew directory | `id`, `name`, `slug`, `tmdb_id`, `known_for_department`, `biography` |
| `seasons` | TV seasons per series | `id`, `tv_series_id` → `tv_series`, `season_number`, `episode_count`, `air_date` |
| `watch_providers` | Streaming availability by country | `id`, `movie_id` / `tv_series_id`, `provider_name`, `country_code`, `link` |
| `profiles` | User accounts (mirrors `auth.users`) | `id` UUID, `username`, `display_name`, `email`, `role` (`user` \| `admin`) |

### Junction tables

| Table | Links |
|---|---|
| `movie_credits` | `movie_id` → `movies`, `person_id` → `people`; columns: `role` (`cast`\|`crew`), `character_name`, `job`, `credit_order` |
| `tv_credits` | `tv_series_id` → `tv_series`, `person_id` → `people`; same columns as `movie_credits` |
| `movie_genres` | `movie_id` → `movies`, `genre_id` → `genres` |
| `tv_genres` | `tv_series_id` → `tv_series`, `genre_id` → `genres` |
| `user_list_movies` | `list_id` → `user_lists`, `movie_id` → `movies`; PK: `(list_id, movie_id)` |
| `user_list_tv_series` | `list_id` → `user_lists`, `tv_series_id` → `tv_series`; PK: `(list_id, tv_series_id)` |

### User-activity tables

| Table | Purpose | Key columns |
|---|---|---|
| `movie_ratings` | Per-user film ratings 1–10 | PK: `(user_id, movie_id)`, `rating`, `created_at`, `updated_at` |
| `tv_series_ratings` | Per-user TV ratings 1–10 | PK: `(user_id, tv_series_id)`, `rating`, `created_at`, `updated_at` |
| `movie_reviews` | Film reviews with spoiler flag | `id`, `user_id`, `movie_id`, `headline`, `body`, `contains_spoiler` |
| `tv_series_reviews` | TV reviews with spoiler flag | `id`, `user_id`, `tv_series_id`, `headline`, `body`, `contains_spoiler` |
| `user_lists` | Named watchlists / collections | `id`, `user_id`, `name`, `is_public`, `is_favorites` |
| `recommendations` | ML-generated recommendations | `user_id`, `movie_id` / `tv_series_id`, `score` FLOAT, `source` (`cornac-bpr` \| `surprise-svd`) |

### Views

| View | Purpose |
|---|---|
| `movies_with_genres` | `movies` + aggregated `genre_names TEXT[]` — used by browse & search |
| `tv_series_with_genres` | `tv_series` + aggregated `genre_names TEXT[]` — used by browse & search |
| `movie_stats` | Per-film `avg_rating`, `total_ratings`, `total_reviews` |
| `tv_series_stats` | Per-show `avg_rating`, `total_ratings`, `total_reviews` |

### RPC functions

| Function | Arguments | Returns |
|---|---|---|
| `search_all` | `query_text, page_size?, page_offset?, p_type?, p_year_start?, p_year_end?, p_genre?` | Ranked rows across movies + TV |
| `search_movies` | `query_text, page_size?, page_offset?` | Movie rows with relevance score |
| `search_tv_series` | `query_text, page_size?, page_offset?` | TV rows with relevance score |
| `get_movie_detail` | `p_slug, requesting_user_id?` | Full movie JSON (credits, genres, ratings, reviews, providers) |
| `get_tv_detail` | `p_slug, requesting_user_id?` | Full TV JSON (same shape) |
| `get_fallback_recommendations` | `p_user_id, p_limit?` | Top-rated unseen titles for cold-start |
| `generate_recommendations` | `p_user_id` | Triggers in-DB recommendation refresh |
| `similar_movies` | `p_movie_id, p_limit?` | Genre-overlap similar films |
| `similar_tv_series` | `p_tv_series_id, p_limit?` | Genre-overlap similar shows |
| `is_admin` | — | `BOOLEAN` — checks caller's `profiles.role` |

---

## Quick Start

```bash
git clone https://github.com/pnsw123/Khayal.git
cd Khayal
npm install

cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

npm run dev
# open http://localhost:3000
```

> Full local Supabase setup (migrations, seed data, Python sync) → [CONTRIBUTING.md](CONTRIBUTING.md)

---

## Environment Variables

### Required to run

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Production only

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis URL — rate limiter on `/auth/callback` |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis token |

> Rate limiter auto-disables in dev if Redis vars are absent.

### Python sync scripts only

| Variable | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key |
| `TMDB_API_KEY` | TMDB API v3 key — [free at themoviedb.org](https://www.themoviedb.org/settings/api) |

---

## Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpnsw123%2FKhayal&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN)

---

## Data Attribution

<a href="https://www.themoviedb.org" target="_blank">
  <img src="public/tmdb-logo.svg" alt="The Movie Database" width="200" />
</a>

This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## Performance

Load-tested with k6 against production (10,200+ title catalogue, Supabase PostgreSQL).
Benchmark source: [`k6/results/search-browse-summary.json`](k6/results/search-browse-summary.json)

| Metric | Result | Threshold |
|---|---|---|
| p95 response time | **187 ms** | < 500 ms ✓ |
| p99 response time | **313 ms** | — |
| Median response time | **94 ms** | — |
| Error rate | **0.00 %** | < 1 % ✓ |
| Total requests | **4,821** | — |
| Throughput | **161 req/s** | — |
| Concurrency | 50 virtual users × 30 s | — |
| Gate 16 status | **PASS** | — |

Endpoints tested: `GET /api/recommendations`, `GET /browse?genre=<genre>`, `GET /`, `GET /api/search` (FTS).
Re-run: `BASE_URL=https://khayal.app k6 run k6/search-browse-load.js`
Results auto-committed to `k6/results/search-browse-summary.json` by the [load-test workflow](.github/workflows/load-tests.yml).

### Scenarios

| Scenario | VUs | Duration | Endpoint | Threshold |
|---|---|---|---|---|
| `search_browse` | 50 | 30 s | `/api/recommendations`, `/browse`, `/` | p95 < 500 ms |
| `search_fts` | 20 | 30 s | `GET /api/search?q=<term>&type=movie&page_size=20` | p95 < 500 ms |

`search_fts` exercises the `search_all` full-text search PostgreSQL RPC end-to-end over HTTP, ensuring the FTS path is covered by gate 16.

---

## Academic Context

Khayal was built as a **Bilkent University CS436** Database Systems course project. The most technically interesting component is the dual-algorithm recommendation pipeline, described below for academic reviewers.

### Recommendation Pipeline

```
TMDB API → daily_sync.py → user_ratings table
                                   │
                    ┌──────────────┴──────────────┐
                    ▼                             ▼
         train_recommendations.py         surprise_train.py
         cornac BPR (k=64 factors,        scikit-surprise SVD
         20 epochs)                        (k=100 factors, 20 epochs,
                    │                      lr=0.005, reg=0.02)
                    └──────────────┬──────────────┘
                                   ▼
                      recommendations table
                      (user_id, movie_id, score FLOAT,
                       source TEXT — "cornac-bpr" | "surprise-svd",
                       created_at TIMESTAMPTZ)
                                   │
                     GET /api/recommendations
                     (ordered by score DESC, limit 12–100)
```

**Algorithms used:**

| Algorithm | Library | Variant | Hyperparameters |
|---|---|---|---|
| Bayesian Personalised Ranking | cornac | BPR | k=64 latent factors, 20 epochs |
| Matrix Factorisation | scikit-surprise | SVD | k=100 factors, 20 epochs, lr=0.005, reg=0.02 |

**How scores are stored:** each training run upserts rows into the `recommendations` table with a float `score` — predicted rating on the 1–10 scale for SVD; relative preference score for BPR — and a `source` label identifying the algorithm. The API reads `score DESC` so highest-confidence items surface first. Both algorithms write to the same table; the `source` column lets the API caller filter by algorithm via `?algo=cornac-bpr` or `?algo=surprise-svd`.

**Cold-start handling:** new users with no ratings have no rows in `recommendations`. The API falls back to an RPC call (`get_fallback_recommendations`) that returns globally top-rated titles the user has not yet seen, providing a meaningful browse experience from day one. The Demo section above notes that personalised recommendations activate after 5 ratings — once the nightly GitHub Actions cron at `03:00 UTC` runs both training scripts, personalised rows are upserted and the fallback path is bypassed automatically.

**ETL summary:** `daily_sync.py` fetches new and updated titles from the TMDB API and populates the `movies` and `tv_shows` tables. User rating events (1–10 scale) are written to `user_ratings` by the application layer. Both ML scripts read `user_ratings` directly via the Supabase service-role client, train in-process on the GitHub Actions runner, and write results back to `recommendations` — no separate ML infrastructure required.

---

## License

[MIT](LICENSE)
