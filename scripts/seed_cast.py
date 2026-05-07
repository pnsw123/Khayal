#!/usr/bin/env python3
"""
Seed cast and crew for all movies and TV series in the database.
Pulls top 10 cast + director per title from TMDB.

Usage:
    python scripts/seed_cast.py
    python scripts/seed_cast.py --top-cast 15

Run AFTER migration 20260508010000_add_people_and_credits.sql is applied.
"""
from __future__ import annotations
import argparse, os, time
from dotenv import load_dotenv
from slugify import slugify
from supabase import Client, create_client
from tmdbv3api import TMDb, Movie, TV, Person as PersonAPI

load_dotenv()

POSTER_BASE   = "https://image.tmdb.org/t/p/w185"
BATCH_SIZE    = 100
SLEEP_S       = 0.05


def init_tmdb() -> None:
    t = TMDb()
    t.api_key = os.environ["TMDB_API_KEY"]
    t.language = "en"


def init_supabase() -> Client:
    ref = os.environ["SUPABASE_PROJECT_REF"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(f"https://{ref}.supabase.co", key)


def _raw(obj) -> dict:
    if hasattr(obj, "_json"):
        return obj._json
    return obj if isinstance(obj, dict) else {}


def make_person_slug(name: str, tmdb_id: int) -> str:
    base = slugify(name or "unknown", max_length=80)
    return f"{base}-{tmdb_id}"


def upsert_people(sb: Client, people: list[dict]) -> dict[int, int]:
    """Upsert people rows, return {tmdb_id: our_id}."""
    if not people:
        return {}
    sb.table("people").upsert(people, on_conflict="tmdb_id").execute()
    tmdb_ids = [p["tmdb_id"] for p in people]
    res = sb.table("people").select("id,tmdb_id").in_("tmdb_id", tmdb_ids).execute()
    return {r["tmdb_id"]: r["id"] for r in (res.data or [])}


def process_credits(raw_credits: dict, our_id: int, id_key: str,
                    person_map: dict[int, int], top_cast: int) -> list[dict]:
    """Build credit rows from TMDB credits response."""
    links = []

    # Cast
    for member in (raw_credits.get("cast") or [])[:top_cast]:
        pid = person_map.get(member.get("id"))
        if pid:
            links.append({
                id_key:          our_id,
                "person_id":     pid,
                "role":          "cast",
                "character_name": (member.get("character") or "")[:200] or None,
                "credit_order":  member.get("order", 999),
            })

    # Director only from crew
    for member in (raw_credits.get("crew") or []):
        if member.get("job") == "Director":
            pid = person_map.get(member.get("id"))
            if pid:
                links.append({
                    id_key:      our_id,
                    "person_id": pid,
                    "role":      "crew",
                    "job":       "Director",
                    "credit_order": 0,
                })
            break  # one director is enough

    return links


def seed_movie_cast(sb: Client, top_cast: int) -> None:
    print(f"\n📽️   Movie cast — top {top_cast} cast + director per movie...")
    api = Movie()
    movies = sb.table("movies").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    credit_rows: list[dict] = []
    total_people = 0
    total_credits = 0

    for i, movie in enumerate(movies.data or [], 1):
        try:
            raw = _raw(api.credits(movie["tmdb_id"]))
            all_members = (raw.get("cast") or [])[:top_cast] + (raw.get("crew") or [])
            # Filter crew to director only
            all_members = (raw.get("cast") or [])[:top_cast] + \
                          [c for c in (raw.get("crew") or []) if c.get("job") == "Director"][:1]

            people_rows = [
                {
                    "name":                 m.get("name", "Unknown")[:200],
                    "slug":                 make_person_slug(m.get("name", ""), m.get("id", 0)),
                    "tmdb_id":              m.get("id"),
                    "profile_path":         f"{POSTER_BASE}{m['profile_path']}" if m.get("profile_path") else None,
                    "known_for_department": m.get("known_for_department"),
                }
                for m in all_members if m.get("id")
            ]

            person_map = upsert_people(sb, people_rows)
            total_people += len(person_map)

            links = process_credits(raw, movie["id"], "movie_id", person_map, top_cast)
            credit_rows.extend(links)

        except Exception as e:
            print(f"   ⚠️  movie {movie['tmdb_id']} skipped: {e}")

        if len(credit_rows) >= BATCH_SIZE:
            sb.table("movie_credits").upsert(credit_rows, on_conflict="movie_id,person_id,role,job").execute()
            total_credits += len(credit_rows)
            credit_rows = []
            print(f"   ↳ {i} movies  credits={total_credits}")

        time.sleep(SLEEP_S)

    if credit_rows:
        sb.table("movie_credits").upsert(credit_rows, on_conflict="movie_id,person_id,role,job").execute()
        total_credits += len(credit_rows)

    print(f"✅   Movie cast done — {total_credits} credit rows, ~{total_people} people")


def seed_tv_cast(sb: Client, top_cast: int) -> None:
    print(f"\n📺   TV cast — top {top_cast} cast + director per series...")
    api = TV()
    series = sb.table("tv_series").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    credit_rows: list[dict] = []
    total_credits = 0

    for i, show in enumerate(series.data or [], 1):
        try:
            raw = _raw(api.credits(show["tmdb_id"]))
            all_members = (raw.get("cast") or [])[:top_cast] + \
                          [c for c in (raw.get("crew") or []) if c.get("job") == "Director"][:1]

            people_rows = [
                {
                    "name":                 m.get("name", "Unknown")[:200],
                    "slug":                 make_person_slug(m.get("name", ""), m.get("id", 0)),
                    "tmdb_id":              m.get("id"),
                    "profile_path":         f"{POSTER_BASE}{m['profile_path']}" if m.get("profile_path") else None,
                    "known_for_department": m.get("known_for_department"),
                }
                for m in all_members if m.get("id")
            ]

            person_map = upsert_people(sb, people_rows)
            links = process_credits(raw, show["id"], "tv_series_id", person_map, top_cast)
            credit_rows.extend(links)

        except Exception as e:
            print(f"   ⚠️  tv {show['tmdb_id']} skipped: {e}")

        if len(credit_rows) >= BATCH_SIZE:
            sb.table("tv_credits").upsert(credit_rows, on_conflict="tv_series_id,person_id,role,job").execute()
            total_credits += len(credit_rows)
            credit_rows = []
            print(f"   ↳ {i} TV  credits={total_credits}")

        time.sleep(SLEEP_S)

    if credit_rows:
        sb.table("tv_credits").upsert(credit_rows, on_conflict="tv_series_id,person_id,role,job").execute()
        total_credits += len(credit_rows)

    print(f"✅   TV cast done — {total_credits} credit rows")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top-cast", type=int, default=10, help="Max cast members per title (default 10)")
    args = ap.parse_args()

    init_tmdb()
    sb = init_supabase()
    seed_movie_cast(sb, args.top_cast)
    seed_tv_cast(sb, args.top_cast)


if __name__ == "__main__":
    main()
