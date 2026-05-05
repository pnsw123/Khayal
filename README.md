# KHAYAL · خيال

A cinema index. Browse 10,000+ real films and TV shows, rate them, review them, save them to watchlists. Think IMDb or Letterboxd, not Netflix — KHAYAL catalogs movies, it doesn't stream them.

**Live:** https://khayal-index.vercel.app

---

## What you can do

- Browse **7,400+ movies** and **2,800+ series**, 15+ languages, all real titles
- Rate any title 1–10 (one rating per title per account)
- Write, edit, or delete reviews with a spoiler-toggle
- Save titles to public or private watchlists (Favorites auto-creates)
- Full-text search across titles and overviews
- Write and run your own read-only SQL queries against the catalog
- Play the official trailer inline, or jump to JustWatch / Letterboxd / IMDb

---

## Where the data comes from

Every movie, TV series, poster, backdrop, and trailer on KHAYAL is pulled from [**The Movie Database (TMDB)**](https://www.themoviedb.org/). TMDB is a free, community-maintained database of films and TV used by Plex, Kodi, Radarr, Sonarr and many others.

How it connects:

1. A Python seed script calls TMDB's REST API — endpoints like `/movie/popular`, `/tv/top_rated`, `/discover/movie?with_original_language=ja` — to collect movie and series IDs.
2. For each ID, it fetches the full details (title, overview, release date, runtime, age rating, language, country, poster path, backdrop path) and upserts a row into Supabase.
3. A second pass calls `/movie/{id}/videos` to grab the official trailer's YouTube ID, so KHAYAL can embed it directly on the detail page.
4. A GitHub Action re-runs parts of this pipeline on a daily cron so the catalog stays current as TMDB releases new titles.

KHAYAL uses the TMDB API but is not endorsed by or affiliated with TMDB.

---

## Tech stack

| Layer | What we use | Why |
|---|---|---|
| **Framework** | [Next.js 15](https://nextjs.org) with the App Router + React Server Components | Server-rendered pages and auth cookies out of the box |
| **Language** | [TypeScript](https://www.typescriptlang.org) | Types catch half our bugs before they ship |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com) | Fast to iterate, no runtime CSS-in-JS overhead |
| **Database + auth + storage** | [Supabase](https://supabase.com) (Postgres + RLS + email/password auth) | One managed service, no separate backend |
| **Search** | Postgres full-text search (`tsvector` + GIN indexes) | Built into Postgres, fast enough at 10k rows |
| **SQL Explorer** | A Postgres function that only accepts `SELECT` | Lets anyone safely run read-only queries from the browser |
| **Data source** | [TMDB API v3](https://www.themoviedb.org/) | Free, comprehensive, covers posters + trailers |
| **Hosting** | [Vercel](https://vercel.com) (hobby tier) | Auto-deploy on every push to `main` |
| **Daily data sync** | [GitHub Actions](https://github.com/features/actions) (cron) | Free scheduled runs to pull fresh TMDB titles |
| **Fonts** | [Fraunces](https://github.com/undercasetype/Fraunces), [Inter](https://github.com/rsms/inter), [JetBrains Mono](https://github.com/JetBrains/JetBrainsMono), [Reem Kufi](https://github.com/alif-type/reem-kufi) | Pairs a variable serif, clean sans, mono, and an Arabic geometric |
| **Trailer embed** | YouTube's `youtube-nocookie` iframe | No Google tracking cookies until the user hits play |

### Python libraries used to seed the catalog

| Library | Purpose |
|---|---|
| [`tmdbv3api`](https://github.com/AnthonyBloomer/tmdbv3api) | TMDB API wrapper (auth, pagination) |
| [`python-slugify`](https://github.com/un33k/python-slugify) | Turns titles into URL-safe slugs |
| [`supabase-py`](https://github.com/supabase-community/supabase-py) | Upsert rows into Postgres |
| [`python-dotenv`](https://github.com/theskumar/python-dotenv) | Reads local `.env` for keys |

---

## Routes

| Path | Purpose |
|---|---|
| `/` | Redirects to `/browse` |
| `/browse` | Discovery shelves + filter grid (language, age rating) |
| `/movies/[slug]` | Movie detail — overview, rate, review, save, trailer, external links |
| `/tv/[slug]` | Same as the movie detail page but for TV series |
| `/search` | Full-text search + a read-only SQL explorer |
| `/login` | Email + password sign-in / sign-up |
| `/profile` | Your ratings, reviews, lists, recent activity |
| `/lists/[id]` | A public or private watchlist |
| `/auth/callback` | Handles the email-verification redirect |

---

## Credits

- **[TMDB](https://www.themoviedb.org/)** — every title, poster, backdrop, and trailer
- **[Supabase](https://github.com/supabase/supabase)** — Postgres, auth, RLS, Storage
- **[Next.js](https://github.com/vercel/next.js)** — React framework + server components
- **[Vercel](https://vercel.com)** — hosting + auto-deploy
- **[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss)** — styling
- **[Motion](https://github.com/motiondivision/motion)** — animations
- **[Lucide](https://github.com/lucide-icons/lucide)** — icons
- **[YouTube](https://www.youtube.com)** — embedded trailer playback
- **[JustWatch](https://www.justwatch.com) / [Letterboxd](https://letterboxd.com) / [IMDb](https://www.imdb.com)** — external streaming & credits hand-off
- Python seeders: [`tmdbv3api`](https://github.com/AnthonyBloomer/tmdbv3api), [`python-slugify`](https://github.com/un33k/python-slugify), [`supabase-py`](https://github.com/supabase-community/supabase-py)

Built by [pnsw123](https://github.com/pnsw123).

خيال (*khayāl*) — Arabic for *imagination* / *fantasy*.
