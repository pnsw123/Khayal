# Contributing to Khayal

Khayal is an academic project (Bilkent University CS436) that also aims for production-grade open-source quality. Contributions — bug reports, fixes, documentation improvements — are welcome.

---

## Table of Contents

1. [Local Development Setup](#1-local-development-setup)
2. [Supabase: Local vs Hosted](#2-supabase-local-vs-hosted)
3. [Seeding the Database from TMDB](#3-seeding-the-database-from-tmdb)
4. [Running the Full Test Stack](#4-running-the-full-test-stack)
5. [Branch / PR / Commit Conventions](#5-branch--pr--commit-conventions)
6. [File Naming Conventions](#6-file-naming-conventions)

---

## 1. Local Development Setup

### Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| Python | 3.11+ | [python.org](https://python.org) |
| Git | any | [git-scm.com](https://git-scm.com) |
| Supabase CLI | latest | `brew install supabase/tap/supabase` |

### Frontend

```bash
# 1. Clone
git clone https://github.com/pnsw123/Khayal.git
cd Khayal

# 2. Install JS dependencies
npm install

# 3. Set environment variables
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# (see Section 2 for how to get these)

# 4. Start dev server
npm run dev
# → http://localhost:3000
```

### Python scripts

```bash
# Install sync dependencies
pip install -r scripts/requirements.txt

# Install dev/test dependencies
pip install -r scripts/requirements-dev.txt

# Install ML dependencies (optional — only needed for recommendation training)
pip install -r scripts/requirements-ml.txt
```

---

## 2. Supabase: Local vs Hosted

You have two options. Local is faster for iteration; hosted matches production exactly.

### Option A — Supabase Cloud (hosted, recommended for beginners)

1. Create a free project at [supabase.com](https://supabase.com).
2. Go to **Project Settings → API** and copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (scripts only — keep secret)
3. Paste those values into `.env.local`.
4. Run the schema migrations (SQL files in `supabase/migrations/` if present, or apply the schema from the Database Schema section of `README.md`).

### Option B — Local Supabase (CLI)

```bash
# 1. Start local Supabase stack (Docker required)
supabase start

# Output includes local URLs and keys, e.g.:
#   API URL:  http://127.0.0.1:54321
#   anon key: eyJ...
#   service_role key: eyJ...

# 2. Copy those values into .env.local:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from above>
SUPABASE_SERVICE_ROLE_KEY=<service_role key from above>

# 3. Apply schema migrations
supabase db reset
# Runs all files in supabase/migrations/ in order

# 4. Stop when done
supabase stop
```

> Integration tests (`pytest -m integration`) require a running Supabase instance (local or hosted).

---

## 3. Seeding the Database from TMDB

The database is populated by Python scripts that call the TMDB API and upsert records into Supabase.

### Get a TMDB API key

1. Create a free account at [themoviedb.org](https://www.themoviedb.org).
2. Go to **Account → Settings → API** and request a key.
3. Copy the **API Read Access Token** (v4 Bearer token) into `.env.local`:

```bash
TMDB_API_KEY=eyJ...   # or the v3 key string
```

### Run the sync

```bash
# Sync trending/popular movies and TV shows from TMDB → Supabase
python scripts/daily_sync.py

# Train collaborative-filtering recommendation models (requires ratings data)
python scripts/train_recommendations.py
python scripts/surprise_train.py
```

The same scripts run automatically in GitHub Actions on a daily cron (`0 3 * * *`). See `.github/workflows/daily-sync.yml`.

### Environment variables required by scripts

| Variable | Source | Purpose |
|----------|--------|---------|
| `SUPABASE_URL` | Supabase dashboard or `supabase start` | Database host |
| `SUPABASE_SERVICE_KEY` | Supabase dashboard or `supabase start` | Bypasses RLS for bulk writes |
| `TMDB_API_KEY` | TMDB API settings page | Fetches movie/TV metadata |

> The Python scripts read these from the environment (or a `.env` file via `python-dotenv`). Never commit real keys.

---

## 4. Running the Full Test Stack

Run all gates with a single command:

```bash
# Frontend + TypeScript
npx tsc --noEmit                           # type safety
npx eslint src/ --max-warnings 0           # linting
npx vitest run                             # unit tests
npx playwright test                        # E2E tests
npx playwright test --grep @smoke          # smoke tests
npm run build                              # build check

# Python scripts
mypy scripts/ --strict                     # type safety
ruff check scripts/                        # linting
pytest scripts/ -m "not integration"       # unit tests
bandit -r scripts/                         # security SAST
pip-audit                                  # CVE scanning
```

### What each layer covers

| Layer | Command | What it tests |
|-------|---------|---------------|
| Type safety | `npx tsc --noEmit` | Zero TypeScript errors across `src/` |
| Linting | `npx eslint src/` | Style, unused imports, unsafe patterns |
| Unit tests | `npx vitest run` | Pure functions, hooks, utilities |
| E2E tests | `npx playwright test` | Full browser flows (browse, search, auth, ratings) |
| Smoke tests | `npx playwright test --grep @smoke` | Critical paths only — fast subset of E2E |
| Build | `npm run build` | Next.js production build with no errors |
| Python types | `mypy scripts/ --strict` | Strict typing on all sync/ML scripts |
| Python lint | `ruff check scripts/` | PEP8 + opinionated style |
| Python tests | `pytest scripts/` | Unit tests for sync helpers and ML utilities |

### Test file naming

Every source file must have a corresponding test file before a PR is opened:

| Source | Test file |
|--------|-----------|
| `src/hooks/use-X.ts` | `src/tests/use-X.test.ts` |
| `src/components/X.tsx` | `src/tests/X.test.tsx` |
| `src/app/api/X/route.ts` | `src/tests/X-api.test.ts` |
| `src/lib/X.ts` | `src/tests/X.test.ts` |
| `scripts/X.py` | `scripts/test_X.py` |
| User flows | `e2e/X.spec.ts` |

---

## 5. Branch / PR / Commit Conventions

### Branch naming

```
<type>/<issue-number>-<short-description>

fix/148-contributing-guide
feat/201-user-shelves
chore/155-upgrade-next
docs/160-api-reference
```

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <short description>

fix(docs): add CONTRIBUTING.md with local setup guide (#148)
feat(ui): add watchlist shelf to profile page (#201)
chore(deps): upgrade Next.js to 15.3 (#210)
```

| Type | When to use |
|------|-------------|
| `feat` | New feature visible to users |
| `fix` | Bug fix |
| `docs` | Documentation only |
| `chore` | Tooling, deps, CI — no production code |
| `refactor` | Code restructure with no behaviour change |
| `test` | Adding or fixing tests |
| `perf` | Performance improvement |

### Pull requests

1. Open a PR against `main`.
2. Title must match the commit convention above.
3. Link the issue: `Resolves #<N>` in the PR body.
4. All mandatory test-stack gates must pass (CI checks).
5. At least one approving review before merge.

### Definition of Done

A PR is mergeable when:

- [ ] All mandatory test-stack gates pass (see Section 4)
- [ ] New code has corresponding test files
- [ ] TypeScript strict mode — zero errors
- [ ] No high-severity CVEs (`grype`, `pip-audit`)
- [ ] Issue linked and will auto-close on merge

---

## 6. Academic Files — Stay Outside the Repo

Khayal is also a Bilkent University CS436 course submission. The following files live in the **parent directory** (`../`) by design and **must never be committed**:

| File | Why it stays out |
|------|-----------------|
| `khayal-report.pdf` | Academic submission PDF — contains names, student IDs |
| `khayal-report.tex` / `.aux` / `.log` / `.out` | LaTeX source for the above |
| `PRD.md` | Internal product requirements — not public API |
| `README.docx` | Word draft — superseded by `README.md` |
| `PROJECT_REQUIREMENTS.md` | Course rubric — irrelevant to open-source contributors |

`.gitignore` blocks `*.pdf`, `*.docx`, `*.tex`, `*.aux`, `*.log`, `*.out`, `PRD.md`, `PROJECT_REQUIREMENTS.md`, and `khayal-report.*` at the repo root as a defense-in-depth measure. If you accidentally copy one of these into the repo directory, `git status` will not surface it and `git add -A` will skip it.

**Never force-add these files** (`git add -f`). They contain personally identifiable student information and course-internal content not meant for the public repository.

---

## Questions?

Open a [GitHub Discussion](https://github.com/pnsw123/Khayal/discussions) or file an issue with the `question` label.
