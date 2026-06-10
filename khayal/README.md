<div align="center">

# KHAYAL · خيال

**A cinematic discovery platform — 7,400+ films · 2,800+ TV shows**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-movie--db--one--psi.vercel.app-black?style=for-the-badge&logo=vercel)](https://movie-db-one-psi.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com)

[![TMDB](https://img.shields.io/badge/Data%20from-TMDB-01b4e4?style=for-the-badge&logo=themoviedb&logoColor=white)](https://www.themoviedb.org)
[![MIT License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

*Academic project — Bilkent University CS436 (Database Systems)*

</div>

---

## Overview

Khayal is a full-stack cinematic discovery platform. Browse, search, and track films and TV shows from a curated database of **7,400+ films** and **2,800+ TV shows** synced from TMDB. Features personalised recommendations, watchlists, and rating shelves.

**[→ Open live demo](https://movie-db-one-psi.vercel.app)**

---

## Screenshots

| Browse | Detail | Search |
|--------|--------|--------|
| [Browse page →](https://movie-db-one-psi.vercel.app/browse) | [Film detail →](https://movie-db-one-psi.vercel.app/movies) | [Search →](https://movie-db-one-psi.vercel.app/search) |

> Visit the live demo to see the full UI. The app is deployed on Vercel with real data.

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
├── id            UUID  PK
├── tmdb_id       INT   UNIQUE
├── title         TEXT
├── slug          TEXT  UNIQUE
├── overview      TEXT
├── release_date  DATE
├── poster_path   TEXT
├── backdrop_path TEXT
├── runtime       INT
├── vote_average  NUMERIC
└── vote_count    INT

tv_shows
├── id              UUID  PK
├── tmdb_id         INT   UNIQUE
├── name            TEXT
├── slug            TEXT  UNIQUE
├── overview        TEXT
├── first_air_date  DATE
├── poster_path     TEXT
├── backdrop_path   TEXT
├── vote_average    NUMERIC
└── vote_count      INT

genres
├── id    INT  PK
└── name  TEXT

movie_genres  (junction: movies ↔ genres)
tv_genres     (junction: tv_shows ↔ genres)

users
├── id         UUID  PK  (Supabase Auth)
├── username   TEXT  UNIQUE
└── created_at TIMESTAMPTZ

ratings
├── user_id    UUID  FK → users
├── media_type TEXT  ('movie' | 'tv')
├── media_id   UUID  FK → movies | tv_shows
├── score      INT   (1–10)
└── created_at TIMESTAMPTZ

lists
├── id         UUID  PK
├── user_id    UUID  FK → users
├── name       TEXT
└── is_public  BOOL

recommendations
├── user_id    UUID
├── media_type TEXT
├── media_id   UUID
└── score      NUMERIC
```

**Views & RPCs:**
- `movies_with_genres` — movies joined with genre arrays
- `tv_with_genres` — TV shows joined with genre arrays
- `search_all(query)` — full-text search across movies + TV shows

---

## Environment Variables

Create `.env.local` from the table below:

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (scripts) | Service role key for Python sync scripts |
| `TMDB_API_KEY` | Yes (scripts) | TMDB API v3 key — [get one free](https://www.themoviedb.org/settings/api) |

---

## Setup

```bash
# 1. Clone
git clone https://github.com/pnsw123/Khayal.git
cd Khayal

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env.local
# Edit .env.local — fill in Supabase URL, anon key

# 4. Start development server
npm run dev

# 5. Open in browser
open http://localhost:3000
```

> For full local setup including database seeding, see the [AGENTS.md](AGENTS.md) guide.

---

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fpnsw123%2FKhayal&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)

Set environment variables in the Vercel dashboard after deploying.

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

## License

[MIT](LICENSE) — see `LICENSE` for details.
