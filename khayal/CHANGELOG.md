# Changelog

All notable changes to **Khayal** are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions are tagged by project phase rather than semver releases.

---

## [Unreleased]

---

## [0.5.0] — 2026-06-10 — Security hardening · CI pipeline · Filter push-down

### Added
- k6 load tests for `/search`, `/browse`, and `daily-sync` upsert (gate 16)
- `pg_execute_explain` RPC for latency assertions at scale
- Integration tests for `get_movie_detail` / `get_tv_detail` RPCs
- `supabase db push` step in CI — migrations now auto-applied to production
- Unit tests for 22 previously uncovered source files
- GIN full-text-search index on `tv_series` to eliminate sequential scans
- GIN index on `tv_series.genre_names` for genre shelf queries
- PKCE / session token validation in auth callback; CSRF guard on `?code=`
- `CONTRIBUTING.md` with full local setup guide and conventions
- `.env.example` with all required environment variables documented
- Supabase `config.toml` — local development now possible via Supabase CLI
- Admin pagination — prevents OOM on large content/user/review datasets

### Changed
- Type/year/genre filters pushed server-side into `search_all` RPC (was client-side)
- `page_offset` param now forwarded to `search_all` — infinite scroll / load-more unblocked
- `database.types.ts` generated from schema instead of hand-maintained stub
- All 61 `any` usages replaced with typed row interfaces
- Rate limiter replaced in-memory store with Upstash Redis for multi-instance safety
- Daily sync upsert made partial-failure safe — page-by-page with skip on HTTP 429
- `recommendations` API route now surfaces Supabase errors instead of swallowing them
- ESLint `no-console` upgraded to error; server-side `warn`/`error` allowlisted
- `@typescript-eslint/no-explicit-any` and `no-unused-vars` upgraded from warn to error

### Fixed
- **SECURITY** — `SECURITY DEFINER` functions missing `SET search_path` (schema injection risk)
- **SECURITY** — Image proxy blindly forwarded upstream `Content-Type`, allowing SVG/HTML from TMDB CDN
- **SECURITY** — Privilege escalation: any user could self-promote to admin via unguarded `profiles UPDATE` RLS
- **SECURITY** — Auth callback `next` param not validated — open redirect vulnerability
- RLS missing on catalog tables and `saved_queries` — anon key could write
- RLS missing `WITH CHECK` rating bounds on `movie_ratings` / `tv_series_ratings`
- RLS missing `DELETE` protection on catalog tables
- RLS missing `INSERT` policy on `profiles` — new user signup could fail
- ML training scripts used phantom `movie_genre` junction table instead of `movie_genres`
- ML column mismatch between training output and Supabase schema
- CI workflow ran only 4 of 8 mandatory quality gates
- `get_movie_detail` / `get_tv_detail` RPC migration never applied to production (detail pages 404)
- Duplicate RPC migrations with conflicting param names
- `tsconfig` missing `noUnusedLocals` / `noUnusedParameters`
- `vitest.config.ts` missing coverage thresholds

---

## [0.4.0] — 2026-05-12 — ML recommendations · Upstash rate limiter · UI polish

### Added
- Collaborative filtering using scikit-surprise SVD — writes recommendations to Supabase
- Cornac BPR model as second ML backend
- Similar-titles shelf via `similar_movies` / `similar_tv_series` RPCs
- Personalised recommendations shelf on browse page
- Upstash Redis rate limiter for multi-instance safety (replaces in-memory)
- Startup validation for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Trailer modal with YouTube player (`react-player`)
- Cast row with horizontal scroll arrows on detail pages
- Route-level `loading.tsx` skeletons for browse, detail, and search pages
- `data-testid` attributes on `RateWidget`, `AddToListButton`, `ReviewForm`
- TMDB attribution across codebase (required by TMDB API Terms of Service)
- Public user profiles

### Changed
- Landing page rebuilt with ReactBits `ScrollVelocity`, `Aurora`, `TiltedCard`, `CircularGallery` components
- `CircularGallery` lazy-mounted on scroll — prevents dual WebGL context crash
- Navigation made sticky across all pages
- Rate-widget debounced to prevent multiple rapid upserts
- N+1 genre count queries replaced with single cached query

### Fixed
- ML scripts never wrote recommendations to Supabase
- Rate limiter silently disabled if Upstash env vars absent — startup warning added
- Nav not sticky — scrolled away on all pages
- `recommendations` route: `parseInt(limit)` not validated for `NaN`
- TMDB sync fetched only 1 page (20 items) — now paginated with rate-limit back-off
- Cast actor headshots now use `next/image` optimisation

---

## [0.3.0] — 2026-05-07 — Cinematic design system · Admin dashboard · Fly.io deploy

### Added
- Cinematic hero layout on movie/TV detail pages (backdrop, genres, prominent rating)
- Admin dashboard with content, users, and reviews management
- Watch providers section on detail pages
- Seasons accordion on TV detail pages
- Genre filter chips on browse page
- Avatar upload on profile page
- Fly.io deployment — `Dockerfile`, `fly.toml`, Next.js standalone output
- `seed_tv_by_language.py` — TV equivalent of the discover-seed helper
- Watchlists — users can save titles to named lists
- TV parity — all movie features ported to TV series pages

### Changed
- Design system overhauled: single shape token, new `ink/cream/accent/saffron` color palette
- DM Sans set as primary typeface
- Filter bar: sticky `top-16` (below nav), horizontal-scroll single-line, no wrapping
- `run_query` blocks embedded semicolons to prevent multi-statement SQL injection
- KHAYAL branded favicon uses actual `خ` glyph

### Fixed
- Amber/yellow purged from all UI chrome
- `ScrollStack` / `Lenis` removed — caused scroll lag
- 114 ESLint issues resolved to 0
- Filter bar wrapping fixed — enforced single-line horizontal scroll

---

## [0.2.0] — 2026-04-18 — Full-text search · TMDB sync · Daily pipeline

### Added
- PostgreSQL full-text search RPCs: `search_movies`, `search_tv_series`, `search_all`
- `saved_queries` table and `run_query` RPC for SQL query interface
- GitHub Actions `daily-sync.yml` — automated nightly TMDB sync
- Live type-to-search (200 ms debounce, 2-char min, stale-request guard)
- YouTube trailer support via TMDB `/videos` endpoint (embedded `<iframe>`)
- YouTube fallback search for titles TMDB has no video for
- Mobile navigation and Watch-trailer CTA

### Changed
- Slug deduplication handles tables with 7 000+ rows
- `existing_tmdb_ids` fetch paginated to handle large tables
- `ON CONFLICT` strategy aligned with insert strategy in test suite

### Fixed
- Pagination bug in TMDB backfill script
- Slug collision on insert — appends `tmdb_id` when slug already exists

---

## [0.1.0] — 2026-03-21 — Initial schema · Supabase migrations · Project bootstrap

### Added
- Supabase PostgreSQL schema with 12 tables: `movies`, `tv_series`, `profiles`, `movie_ratings`, `tv_series_ratings`, `movie_genres`, `genres`, `cast`, `people`, `seasons`, `watchlist_items`, `saved_queries`
- `movies_with_genres` view and `search_all` RPC
- Initial TMDB seed scripts (`seed_movies.py`, `seed_tv.py`)
- Next.js 15 App Router project with TypeScript strict mode, Tailwind CSS v4
- Supabase auth with Google OAuth and email/password

[Unreleased]: https://github.com/pnsw123/Khayal/compare/HEAD...HEAD
[0.5.0]: https://github.com/pnsw123/Khayal/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/pnsw123/Khayal/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/pnsw123/Khayal/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/pnsw123/Khayal/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/pnsw123/Khayal/releases/tag/v0.1.0
