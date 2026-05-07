#!/usr/bin/env python3
"""
Seed seasons for all TV series in the database.
TMDB returns seasons[] inside the TV detail response — no extra API call needed.

Usage:
    python scripts/seed_seasons.py
"""
from __future__ import annotations
import os, time
from dotenv import load_dotenv
from supabase import Client, create_client
from tmdbv3api import TMDb, TV

load_dotenv()

POSTER_BASE = "https://image.tmdb.org/t/p/w300"
BATCH_SIZE  = 200
SLEEP_S     = 0.05


def init_tmdb() -> None:
    t = TMDb()
    t.api_key = os.environ["TMDB_API_KEY"]
    t.language = "en"


def init_supabase() -> Client:
    ref = os.environ["SUPABASE_PROJECT_REF"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(f"https://{ref}.supabase.co", key)


def _raw(obj) -> dict:
    return obj._json if hasattr(obj, "_json") else (obj if isinstance(obj, dict) else {})


def transform_season(s: dict, tv_series_id: int) -> dict | None:
    num = s.get("season_number")
    if num is None:
        return None
    # Skip "Specials" season (season 0) if desired — include it for completeness
    return {
        "tv_series_id":  tv_series_id,
        "season_number": num,
        "name":          s.get("name") or f"Season {num}",
        "overview":      s.get("overview") or None,
        "air_date":      s.get("air_date") or None,
        "episode_count": s.get("episode_count") or None,
        "poster_url":    f"{POSTER_BASE}{s['poster_path']}" if s.get("poster_path") else None,
        "tmdb_season_id": s.get("id"),
    }


def seed_seasons(sb: Client) -> None:
    print("📺  Seeding seasons...")
    api = TV()
    series = sb.table("tv_series").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    batch: list[dict] = []
    total = 0

    for i, show in enumerate(series.data or [], 1):
        try:
            raw = _raw(api.details(show["tmdb_id"]))
            for s in (raw.get("seasons") or []):
                row = transform_season(s, show["id"])
                if row:
                    batch.append(row)
        except Exception as e:
            print(f"   ⚠️  tv {show['tmdb_id']} skipped: {e}")

        if len(batch) >= BATCH_SIZE:
            sb.table("seasons").upsert(batch, on_conflict="tv_series_id,season_number").execute()
            total += len(batch)
            batch = []
            print(f"   ↳ {i} TV series processed, {total} seasons inserted")

        time.sleep(SLEEP_S)

    if batch:
        sb.table("seasons").upsert(batch, on_conflict="tv_series_id,season_number").execute()
        total += len(batch)

    print(f"✅  Seasons done — {total} rows total")


if __name__ == "__main__":
    init_tmdb()
    sb = init_supabase()
    seed_seasons(sb)
