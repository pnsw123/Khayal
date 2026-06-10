# KHAYAL · خيال

A cinematic library of imagination. 7,400+ films and 2,800+ TV shows, indexed and personalised.

Built with Next.js 15, TypeScript, Tailwind CSS v4, and Supabase.

[![TMDB](https://img.shields.io/badge/Data%20from-TMDB-01b4e4?logo=themoviedb&logoColor=white)](https://www.themoviedb.org)

> **Attribution:** This product uses the TMDB API but is not endorsed or certified by TMDB.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, TypeScript strict, Tailwind CSS v4 |
| Database | Supabase (PostgreSQL) — RLS, RPC, views |
| Auth | Supabase Auth |
| Data sync | Python scripts — TMDB API → Supabase |
| ML | scikit-surprise, cornac — personalised recommendations |
| Deployment | Vercel (frontend) + Fly.io (Python workers) |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_KEY=
```

## Data Attribution

This product uses the TMDB API but is not endorsed or certified by TMDB.

[![TMDB](https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg)](https://www.themoviedb.org)

Film and TV data, images, and metadata are provided by [The Movie Database (TMDB)](https://www.themoviedb.org). Use of this data is subject to the [TMDB API Terms of Use](https://www.themoviedb.org/documentation/api/terms-of-use).
