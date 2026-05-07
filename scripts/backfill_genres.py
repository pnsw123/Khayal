#!/usr/bin/env python3
"""
Backfill genres for all existing movies and TV series in the database.
Run this once after applying migration 20260508000000_add_genres.sql.

Usage:
    python scripts/backfill_genres.py
"""
from __future__ import annotations
import os, time
from dotenv import load_dotenv
from slugify import slugify
from supabase import Client, create_client
from tmdbv3api import TMDb, Movie, TV, Genre

load_dotenv()

BATCH_SIZE = 500


def init_tmdb() -> None:
    key = os.environ["TMDB_API_KEY"]
    t = TMDb()
    t.api_key = key
    t.language = "en"


def init_supabase() -> Client:
    ref = os.environ["SUPABASE_PROJECT_REF"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(f"https://{ref}.supabase.co", key)


def _raw(obj):
    if hasattr(obj, "_json"):
        return obj._json
    return dict(obj) if isinstance(obj, dict) else {}


def seed_genres(sb: Client) -> dict[int, int]:
    genre_api = Genre()
    all_genres: dict[int, str] = {}
    for g in (genre_api.movie_list() or []):
        all_genres[g.id] = g.name
    for g in (genre_api.tv_list() or []):
        if g.id not in all_genres:
            all_genres[g.id] = g.name

    rows = [{"name": n, "slug": slugify(n), "tmdb_id": tid} for tid, n in all_genres.items()]
    sb.table("genres").upsert(rows, on_conflict="tmdb_id").execute()

    res = sb.table("genres").select("id,tmdb_id").execute()
    return {r["tmdb_id"]: r["id"] for r in (res.data or []) if r["tmdb_id"]}


def backfill_movie_genres(sb: Client, genre_map: dict[int, int]) -> None:
    print("📽️  Backfilling movie genres...")
    movies = sb.table("movies").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    api = Movie()
    links: list[dict] = []
    total = 0

    for i, m in enumerate(movies.data or [], 1):
        try:
            raw = _raw(api.details(m["tmdb_id"]))
            gids = raw.get("genre_ids") or [g.get("id") for g in (raw.get("genres") or [])]
            for gid in gids:
                if gid in genre_map:
                    links.append({"movie_id": m["id"], "genre_id": genre_map[gid]})
        except Exception:
            pass

        if len(links) >= BATCH_SIZE:
            sb.table("movie_genres").upsert(links, on_conflict="movie_id,genre_id").execute()
            total += len(links)
            links = []
            print(f"  ↳ {i} movies processed, {total} links inserted")

        time.sleep(0.05)

    if links:
        sb.table("movie_genres").upsert(links, on_conflict="movie_id,genre_id").execute()
        total += len(links)

    print(f"✅  Movie genres: {total} links total")


def backfill_tv_genres(sb: Client, genre_map: dict[int, int]) -> None:
    print("📺  Backfilling TV genres...")
    series = sb.table("tv_series").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    api = TV()
    links: list[dict] = []
    total = 0

    for i, s in enumerate(series.data or [], 1):
        try:
            raw = _raw(api.details(s["tmdb_id"]))
            gids = raw.get("genre_ids") or [g.get("id") for g in (raw.get("genres") or [])]
            for gid in gids:
                if gid in genre_map:
                    links.append({"tv_series_id": s["id"], "genre_id": genre_map[gid]})
        except Exception:
            pass

        if len(links) >= BATCH_SIZE:
            sb.table("tv_genres").upsert(links, on_conflict="tv_series_id,genre_id").execute()
            total += len(links)
            links = []
            print(f"  ↳ {i} TV series processed, {total} links inserted")

        time.sleep(0.05)

    if links:
        sb.table("tv_genres").upsert(links, on_conflict="tv_series_id,genre_id").execute()
        total += len(links)

    print(f"✅  TV genres: {total} links total")


if __name__ == "__main__":
    init_tmdb()
    sb = init_supabase()
    genre_map = seed_genres(sb)
    print(f"🏷️  {len(genre_map)} genres seeded")
    backfill_movie_genres(sb, genre_map)
    backfill_tv_genres(sb, genre_map)
