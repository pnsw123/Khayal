# KHAYAL · خيال
### A Cinema Index — Database Systems Class Project

> **Live site →** [movie-db-one-psi.vercel.app](https://movie-db-one-psi.vercel.app)
> **GitHub →** [github.com/pnsw123/Movie-DB](https://github.com/pnsw123/Movie-DB)

KHAYAL (Arabic: *imagination*) is a full-stack movie and TV catalog — think IMDb or Letterboxd. Users can browse 7,400+ real films and 2,800+ TV series, rate titles, write reviews, build watchlists, run full-text searches, and even write their own SQL queries against the live database — all from the browser.

---

## Live App — Screenshots

| Browse | Search |
|:---:|:---:|
| ![Browse](design/khayal-saffron-marquee/browse.png) | ![Search](design/khayal-saffron-marquee/search.png) |

| Movie Detail | Profile |
|:---:|:---:|
| ![Detail](design/khayal-saffron-marquee/detail.png) | ![Profile](design/khayal-saffron-marquee/profile.png) |

---

## Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend** | [Next.js 15](https://nextjs.org) + TypeScript | App Router, React Server Components, SSR |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Utility-first, no runtime overhead |
| **Database** | [Supabase](https://supabase.com) (PostgreSQL) | Hosted Postgres, auth, Row-Level Security |
| **Auth** | Supabase Auth (email/password) | JWT sessions, RLS policies per user |
| **Search** | PostgreSQL `tsvector` + GIN index | Full-text search built into the DB, no extra service |
| **Data Pipeline** | Python + [TMDB API](https://www.themoviedb.org/) | Seeds and syncs 10,000+ titles |
| **UI Design** | [Google Stitch](https://stitch.withgoogle.com) | Designed and prototyped all UI screens before coding |
| **Cloud Automation** | [GitHub Actions](https://github.com/features/actions) | Cron job — fetches new movies every night at 3 AM UTC |
| **Hosting** | [Vercel](https://vercel.com) | Auto-deploys on every push to `main` |

### Python Libraries (Data Pipeline)

| Library | Purpose |
|---|---|
| `tmdbv3api` | TMDB API wrapper — auth, pagination, rate limits |
| `supabase-py` | Upserts rows into Postgres from Python |
| `python-slugify` | Converts titles into clean URL slugs |
| `python-dotenv` | Reads API keys from `.env` |

---

## Where the Data Comes From

All movie and TV data — titles, posters, backdrops, overviews, runtime, age ratings, trailers — comes from **[The Movie Database (TMDB)](https://www.themoviedb.org/)**, the same free API used by Plex, Kodi, and Letterboxd.

```
TMDB API  →  Python scripts  →  Supabase (PostgreSQL)  →  Next.js frontend
```

How the pipeline works:

1. Python scripts call TMDB endpoints (`/movie/popular`, `/tv/top_rated`, `/discover/movie`, etc.)
2. For each title, it fetches full details: title, overview, release date, runtime, age rating, language, country, poster path, backdrop path
3. A second pass calls `/movie/{id}/videos` to grab the official YouTube trailer ID for embedding
4. Rows are upserted into Supabase — existing titles are skipped, new ones are added
5. **Every night at 3 AM UTC**, GitHub Actions re-runs the sync — no human needed, Mac can be off

---

## Cloud Automation — GitHub Actions

![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-Cloud_Cron-2088FF?logo=github-actions&logoColor=white&style=for-the-badge)

The daily sync runs entirely on **GitHub's cloud servers**, independent of any local machine.

```yaml
# .github/workflows/daily-sync.yml
on:
  schedule:
    - cron: "0 3 * * *"   # 3 AM UTC, every night, forever
  workflow_dispatch:        # can also trigger manually from GitHub UI
```

Every run automatically:
1. Fetches movies released in the last 2 days from TMDB
2. Checks which ones are already in the database (skips all duplicates)
3. Resolves any slug collisions before inserting
4. Inserts only new titles with correct slugs, poster URLs, and metadata
5. Runs 54 unit tests to prove nothing broke
6. Exits cleanly even if TMDB or Supabase has a bad night — never kills tomorrow's run

---

## UI Design — Google Stitch

![Google Stitch](https://img.shields.io/badge/Google_Stitch-UI_Design-4285F4?logo=google&logoColor=white&style=for-the-badge)

The interface was designed in **[Google Stitch](https://stitch.withgoogle.com)** before any code was written. Stitch allowed us to prototype the full layout, color system, and component hierarchy visually, then translate it directly into Tailwind CSS.

Key design decisions made in Stitch:
- Dark cinema-first palette — near-black background, cream text, gold accent
- Bilingual branding — English left, Arabic right for the KHAYAL wordmark
- Poster card grid with hover overlays
- Full-bleed backdrop treatment on all detail pages
- Mobile-first responsive layout

---

## Project Structure

```
Movie-DB/
│
├── khayal/                         ← Next.js frontend (everything users see)
│   └── src/
│       ├── app/                    ← All pages (App Router)
│       │   ├── browse/             ← Discovery shelves + filter grid
│       │   ├── movies/[slug]/      ← Movie detail page
│       │   ├── tv/[slug]/          ← TV series detail page
│       │   ├── search/             ← Full-text search + SQL explorer
│       │   ├── login/              ← Sign in / sign up
│       │   ├── profile/            ← Ratings, reviews, watchlists
│       │   └── lists/[id]/         ← Watchlist view
│       │
│       ├── components/             ← Reusable UI components
│       │   ├── movie-card.tsx      ← Poster card with title + year
│       │   ├── shelf.tsx           ← Horizontal scrolling row
│       │   ├── rate-widget.tsx     ← 1–10 rating UI
│       │   ├── review-form.tsx     ← Write / edit / delete review
│       │   ├── trailer.tsx         ← YouTube embed (privacy-safe)
│       │   ├── where-to-watch.tsx  ← JustWatch / Letterboxd / IMDb links
│       │   ├── nav.tsx             ← Top navigation bar
│       │   └── filter-chips.tsx    ← Language / age rating filters
│       │
│       └── lib/                    ← Shared utilities + DB clients
│           ├── supabase-server.ts  ← Server-side Supabase client
│           ├── supabase-browser.ts ← Browser singleton (avoids auth lock bug)
│           ├── auth.ts             ← Sign in / sign up helpers
│           ├── lists.ts            ← Watchlist CRUD
│           └── utils.ts            ← Shared helpers
│
├── scripts/                        ← Python data pipeline
│   ├── daily_sync.py               ← Nightly sync (runs on GitHub Actions cloud)
│   ├── test_daily_sync.py          ← 54 unit tests for the sync
│   ├── seed_tmdb.py                ← Initial bulk seed from TMDB
│   ├── seed_by_language.py         ← Seeds Korean, Japanese, Arabic, French…
│   ├── seed_tv_by_language.py      ← Same for TV series
│   ├── fetch_trailers.py           ← Backfills YouTube trailer IDs
│   └── requirements.txt            ← Python dependencies
│
├── supabase/
│   └── migrations/                 ← Every schema change in order
│       ├── ..._add_search_functions.sql
│       ├── ..._add_stats_detail_and_recommendations.sql
│       └── ..._add_tmdb_id_and_trailer.sql
│
└── .github/
    └── workflows/
        └── daily-sync.yml          ← GitHub Actions cron (runs on the cloud)
```

---

## Frontend Pages

| Route | What it does |
|---|---|
| `/browse` | Main discovery page — shelves by category, filter by language / age rating |
| `/movies/[slug]` | Full movie detail — poster, backdrop, overview, runtime, rating, reviews, trailer |
| `/tv/[slug]` | Same as movie detail but for TV series |
| `/search` | Full-text search across 10,000+ titles + a live SQL explorer tab |
| `/login` | Email + password sign-in / sign-up |
| `/profile` | Your ratings, reviews, and watchlists |
| `/lists/[id]` | Any public (or your private) watchlist |

---

## Backend — Supabase (PostgreSQL)

The entire backend runs on **Supabase** — no custom server required. Supabase gives us hosted PostgreSQL, authentication, and Row-Level Security out of the box.

### Key Tables

| Table | What it stores |
|---|---|
| `movies` | 7,400+ films — title, slug, tmdb_id, release date, runtime, age rating, poster URL, backdrop URL, trailer ID |
| `tv_series` | 2,800+ TV shows — same fields plus status (ongoing/ended/cancelled) |
| `ratings` | One rating (1–10) per user per title |
| `reviews` | User reviews — body, spoiler flag, timestamps |
| `lists` | Watchlists — name, public/private, owner |
| `list_items` | Which titles are in which list |
| `profiles` | One profile row per auth user |

### Key Database Functions (RPCs called from the frontend)

| Function | What it does |
|---|---|
| `search_all(query_text, page_size)` | Full-text search across movies + TV, ranked by relevance |
| `run_query(sql)` | Accepts only `SELECT` — safe SQL explorer for users, blocks writes |
| `get_movie_stats(movie_id)` | Returns average rating + review count |
| `get_recommendations(movie_id)` | Returns similar movies based on language and era |

### Security

- **Row-Level Security (RLS)** — users can only modify their own ratings, reviews, and lists
- **`run_query` RPC** — rejects any SQL that isn't a plain `SELECT`, so nobody can damage the data
- **API keys** — service-role key never touches the browser; only the public anon key is exposed client-side

---

## Data Flow — Full Picture

```
┌──────────────┐    REST API     ┌─────────────────┐
│   TMDB.org   │ ─────────────▶ │  Python scripts  │
│ (data source)│                │  scripts/*.py    │
└──────────────┘                └────────┬─────────┘
                                         │ upsert rows
                                         ▼
                    ┌────────────────────────────────┐
                    │    Supabase — PostgreSQL        │
                    │  movies, tv_series, ratings,   │
                    │  reviews, lists, profiles       │
                    └──────────────┬─────────────────┘
                                   │ SQL / RPC
                         ┌─────────┴──────────┐
                         │   Next.js 15 app   │
                         │  (Vercel — cloud)  │
                         └─────────┬──────────┘
                                   │ HTTP
                              Browser (user)

   ┌─────────────────────────────────────────────┐
   │  GitHub Actions — runs every night at 3 AM  │
   │  Fetches new TMDB content → inserts to DB   │
   │  No local machine needed, runs in the cloud │
   └─────────────────────────────────────────────┘
```

---

## Running Locally

```bash
# 1. Clone
git clone https://github.com/pnsw123/Movie-DB.git
cd Movie-DB

# 2. Frontend
cd khayal
npm install
cp .env.example .env.local   # add your Supabase + TMDB keys
npm run dev                  # → http://localhost:3000

# 3. Python sync (optional)
cd ..
python -m venv .venv && source .venv/bin/activate
pip install -r scripts/requirements.txt
python scripts/daily_sync.py --dry-run   # preview without writing to DB
```

## Running the Tests

```bash
source .venv/bin/activate
python -m pytest scripts/test_daily_sync.py -v
# → 54 passed
```

The suite covers: slug generation, movie/TV transform logic, retry behavior, deduplication, batch chunking, graceful failure on bad data, dry-run mode, and full end-to-end flow with mocked TMDB + Supabase.

---

## Credits

| | |
|---|---|
| **[TMDB](https://www.themoviedb.org/)** | Every title, poster, backdrop, and trailer |
| **[Supabase](https://supabase.com)** | PostgreSQL, auth, Row-Level Security |
| **[Next.js](https://nextjs.org)** | React framework + server rendering |
| **[Vercel](https://vercel.com)** | Hosting and auto-deploy |
| **[Google Stitch](https://stitch.withgoogle.com)** | UI design and prototyping |
| **[GitHub Actions](https://github.com/features/actions)** | Cloud automation / nightly sync |
| **[Tailwind CSS](https://tailwindcss.com)** | Styling |
| **[Motion](https://motion.dev)** | Animations |
| **[Lucide](https://lucide.dev)** | Icons |
| **[JustWatch](https://www.justwatch.com) / [Letterboxd](https://letterboxd.com) / [IMDb](https://www.imdb.com)** | External streaming and credits links |

*KHAYAL uses the TMDB API but is not endorsed by or affiliated with TMDB.*

Built by [pnsw123](https://github.com/pnsw123) · خيال (*khayāl*) — Arabic for *imagination*
