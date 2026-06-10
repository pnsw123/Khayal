<div align="center">

# KHAYAL · خيال

**A cinematic discovery platform — 7,400+ films · 2,800+ TV shows**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-movie--db--one--psi.vercel.app-black?style=for-the-badge&logo=vercel)](https://movie-db-one-psi.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.2.9-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.4-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

[![CI](https://github.com/pnsw123/Khayal/actions/workflows/ci.yml/badge.svg)](https://github.com/pnsw123/Khayal/actions/workflows/ci.yml)
[![TMDB](https://img.shields.io/badge/Data%20from-TMDB-01b4e4?style=for-the-badge&logo=themoviedb&logoColor=white)](https://www.themoviedb.org)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

*Academic project — Bilkent University CS436 (Database Systems)*

</div>

---

## Overview

Khayal is a full-stack cinematic discovery platform. Browse, search, and track films and TV shows from a curated database of **7,400+ films** and **2,800+ TV shows** synced from TMDB. Features personalised recommendations, watchlists, and rating shelves.

**[→ Open live demo](https://movie-db-one-psi.vercel.app)**

---

## Features

- **Instant search** — full-text RPC across 10,200+ titles with live dropdown
- **Personalised recommendations** — collaborative filtering via scikit-surprise / cornac, retrained daily
- **Watchlists & shelves** — add films and shows to custom lists; mark favourites
- **10-point rating system** — per-user ratings stored in PostgreSQL, aggregated into per-title averages
- **Reviews with spoiler toggle** — headline + body reviews; readers can hide spoilers
- **Admin panel** — content moderation and user role management
- **Daily TMDB sync** — GitHub Actions cron keeps the catalogue fresh

---

## Demo

| Feature | What to try |
|---------|-------------|
| **Live search** | Type in the search bar → instant results dropdown as you type |
| **Watchlist** | Open any film or show → click "Add to List" → title appears in your watchlist |
| **Star rating** | On a detail page → click a star → rating updates immediately |

> No account needed to browse. Sign up (free) to unlock watchlists and ratings.

---

## Screenshots

| Browse | Detail | Search |
|--------|--------|--------|
| [![Browse](https://raw.githubusercontent.com/pnsw123/Khayal/main/docs/screenshots/browse.png)](https://movie-db-one-psi.vercel.app/browse) | [![Detail](https://raw.githubusercontent.com/pnsw123/Khayal/main/docs/screenshots/detail.png)](https://movie-db-one-psi.vercel.app/movies/the-shawshank-redemption-1994) | [![Search](https://raw.githubusercontent.com/pnsw123/Khayal/main/docs/screenshots/search.png)](https://movie-db-one-psi.vercel.app/search?q=inception) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16 App Router, React 19, TypeScript 5 (strict mode) |
| **Styling** | Tailwind CSS v4, CSS custom properties |
| **Database** | Supabase (PostgreSQL) — RLS, RPC functions, materialised views |
| **Auth** | Supabase Auth (email + OAuth) |
| **Data sync** | Python scripts — TMDB API → Supabase (GitHub Actions daily cron) |
| **ML** | scikit-surprise, cornac — personalised recommendations |
| **Deployment** | Vercel (frontend) + Fly.io (Python workers) |

---

## Scale

| Metric | Count |
|---|---|
| Films | 7,400+ |
| TV Shows | 2,800+ |
| Data source | The Movie Database (TMDB) |
| Sync frequency | Daily (GitHub Actions) |

---

## Database Schema

### Core tables

```
movies
├── id               INT   PK
├── tmdb_id          INT   UNIQUE
├── title            TEXT
├── slug             TEXT  UNIQUE
├── overview         TEXT
├── release_date     DATE
├── poster_url       TEXT
├── backdrop_url     TEXT
├── runtime_minutes  INT
├── age_rating       TEXT
├── original_language TEXT
├── country          TEXT
├── trailer_youtube_id TEXT
└── created_at / updated_at  TIMESTAMPTZ

tv_series
├── id                 INT   PK
├── tmdb_id            INT   UNIQUE
├── title              TEXT
├── slug               TEXT  UNIQUE
├── overview           TEXT
├── first_air_date     DATE
├── last_air_date      DATE
├── status             TEXT
├── poster_url         TEXT
├── backdrop_url       TEXT
├── trailer_youtube_id TEXT
└── created_at / updated_at  TIMESTAMPTZ

genres
├── id    INT  PK
└── name  TEXT

movie_genres   (junction: movies ↔ genres)
tv_genres      (junction: tv_series ↔ genres)

profiles  (one row per Supabase Auth user)
├── id           UUID  PK  (matches auth.users.id)
├── username     TEXT  UNIQUE
├── display_name TEXT
├── avatar_url   TEXT
├── bio          TEXT
├── role         TEXT  ('user' | 'admin')
└── created_at   TIMESTAMPTZ

movie_ratings
├── id           INT   PK
├── user_id      UUID  FK → profiles
├── movie_id     INT   FK → movies
├── rating       INT   (1–10)
└── updated_at   TIMESTAMPTZ

tv_series_ratings
├── id             INT   PK
├── user_id        UUID  FK → profiles
├── tv_series_id   INT   FK → tv_series
├── rating         INT   (1–10)
└── updated_at     TIMESTAMPTZ

movie_reviews
├── id               INT   PK
├── user_id          UUID  FK → profiles
├── movie_id         INT   FK → movies
├── headline         TEXT
├── body             TEXT
├── contains_spoiler BOOL
└── created_at       TIMESTAMPTZ

tv_series_reviews
├── id               INT   PK
├── user_id          UUID  FK → profiles
├── tv_series_id     INT   FK → tv_series
├── headline         TEXT
├── body             TEXT
├── contains_spoiler BOOL
└── created_at       TIMESTAMPTZ

user_lists
├── id           INT   PK
├── user_id      UUID  FK → profiles
├── name         TEXT
├── is_public    BOOL
├── is_favorites BOOL
└── created_at   TIMESTAMPTZ

user_list_movies     (junction: user_lists ↔ movies)
user_list_tv_series  (junction: user_lists ↔ tv_series)

recommendations
├── user_id      UUID  FK → profiles
├── movie_id     INT   FK → movies
├── score        NUMERIC
├── algo         TEXT  (e.g. 'cornac-als')
└── generated_at TIMESTAMPTZ
```

**Views & RPCs:**
- `movies_with_genres` — movies joined with genre arrays (`genre_names TEXT[]`)
- `movie_stats` — per-movie `avg_rating`, `total_ratings`, `total_reviews`
- `search_all(query)` — full-text search RPC across movies + TV series
- `similar_movies(p_movie_id, p_limit)` — RPC for related films
- `similar_tv_series(p_tv_series_id, p_limit)` — RPC for related shows

---

## Environment Variables

### Web app — required to run `npm run dev`

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

### Rate limiting — required in production (optional in dev)

| Variable | Description |
|---|---|
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL — [create a free DB](https://console.upstash.com) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

The `/auth/callback` route is protected by a **distributed sliding-window rate limiter** (10 req / 60 s per IP) backed by Upstash Redis. This works correctly across multiple Fly.io machines and Vercel serverless instances because every process shares the same atomic counter over HTTP.

> **Dev / CI:** If these env vars are absent the rate limiter is disabled automatically. A warning is printed once to the server console. Set the vars before deploying to production.

### Python scripts only — not needed for frontend dev

| Variable | Description |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for Python sync scripts |
| `TMDB_API_KEY` | TMDB API v3 key — [get one free](https://www.themoviedb.org/settings/api) |

---

## Setup

```bash
# 1. Clone
git clone https://github.com/pnsw123/Khayal.git
cd Khayal

# 2. Install dependencies
npm install

# 3. Configure environment (web app only needs two vars)
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
# SUPABASE_SERVICE_ROLE_KEY and TMDB_API_KEY only needed for Python sync scripts

# 4. Start development server
npm run dev

# 5. Open in browser
open http://localhost:3000

# 6. Run tests
npm run test

# 7. Type-check and lint
npm run type-check
npm run lint
```

> For full local setup including database seeding, E2E tests, and Supabase local dev, see [CONTRIBUTING.md](CONTRIBUTING.md).

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpnsw123%2FKhayal&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,UPSTASH_REDIS_REST_URL,UPSTASH_REDIS_REST_TOKEN)

> **Rate limiting:** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are required to enable the `/auth/callback` rate limiter in production. Without them the limiter silently disables itself. Create a free Redis database at [console.upstash.com](https://console.upstash.com) and paste the REST URL and token into the Vercel environment variables.

Set all environment variables in the Vercel dashboard after deploying.

---

## Academic Context

Khayal was built as the capstone project for **CS436 — Database Systems** at [Bilkent University](https://www.bilkent.edu.tr). The project demonstrates:

- Relational schema design with normalisation (3NF)
- Row-Level Security (RLS) policies in PostgreSQL
- Full-text search via Supabase RPC functions
- ETL pipeline (TMDB API → PostgreSQL via Python)
- Collaborative filtering for recommendations (scikit-surprise)
- Real-world deployment with Vercel + Supabase cloud

---

## Data Attribution

<a href="https://www.themoviedb.org" target="_blank">
  <img src="public/tmdb-logo.svg" alt="The Movie Database" width="200" />
</a>

This product uses the TMDB API but is not endorsed or certified by TMDB.

Film and TV data, images, and metadata are provided by [The Movie Database (TMDB)](https://www.themoviedb.org). Use of this data is subject to the [TMDB API Terms of Use](https://www.themoviedb.org/documentation/api/terms-of-use).

---

## Contributing

Bug reports, fixes, and documentation improvements welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for local setup, database seeding, the full test stack, and branch/PR conventions.

---

## License

[MIT](LICENSE) — see `LICENSE` for details.
