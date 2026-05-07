#!/usr/bin/env python3
"""
Backfill tagline, budget, revenue, popularity + watch providers for existing titles.
Run after migration 20260508030000_add_extra_tmdb_fields.sql is applied.

Usage:
    python scripts/backfill_extra_fields.py
    python scripts/backfill_extra_fields.py --country US --skip-providers
"""
from __future__ import annotations
import argparse, os, time
from dotenv import load_dotenv
from supabase import Client, create_client
from tmdbv3api import TMDb, Movie, TV

load_dotenv()

LOGO_BASE  = "https://image.tmdb.org/t/p/w92"
SLEEP_S    = 0.05
BATCH_SIZE = 100


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


def backfill_movies(sb: Client, country: str, skip_providers: bool) -> None:
    print("📽️  Backfilling movie extra fields...")
    api = Movie()
    movies = sb.table("movies").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    updates: list[tuple[int, dict]] = []
    provider_rows: list[dict] = []
    total = 0

    for i, m in enumerate(movies.data or [], 1):
        try:
            raw = _raw(api.details(m["tmdb_id"], append_to_response="watch/providers"))
            update = {
                "tagline":    raw.get("tagline") or None,
                "budget":     raw.get("budget") or None,
                "revenue":    raw.get("revenue") or None,
                "popularity": raw.get("popularity") or None,
            }
            sb.table("movies").update(update).eq("id", m["id"]).execute()
            total += 1

            if not skip_providers:
                providers_data = (raw.get("watch/providers") or {}).get("results", {})
                country_data = providers_data.get(country, {})
                link = country_data.get("link")
                for provider in (country_data.get("flatrate") or []):
                    provider_rows.append({
                        "movie_id":          m["id"],
                        "provider_name":     provider.get("provider_name"),
                        "provider_logo_url": f"{LOGO_BASE}{provider['logo_path']}" if provider.get("logo_path") else None,
                        "country_code":      country,
                        "link":              link,
                    })

        except Exception as e:
            print(f"   ⚠️  movie {m['tmdb_id']}: {e}")

        if len(provider_rows) >= BATCH_SIZE:
            sb.table("watch_providers").upsert(provider_rows).execute()
            provider_rows = []

        if i % 100 == 0:
            print(f"   ↳ {i} movies processed")
        time.sleep(SLEEP_S)

    if provider_rows:
        sb.table("watch_providers").upsert(provider_rows).execute()

    print(f"✅  Movies done — {total} updated")


def backfill_tv(sb: Client, country: str, skip_providers: bool) -> None:
    print("📺  Backfilling TV extra fields...")
    api = TV()
    series = sb.table("tv_series").select("id,tmdb_id").not_.is_("tmdb_id", "null").execute()
    provider_rows: list[dict] = []
    total = 0

    for i, s in enumerate(series.data or [], 1):
        try:
            raw = _raw(api.details(s["tmdb_id"], append_to_response="watch/providers"))
            sb.table("tv_series").update({
                "tagline":    raw.get("tagline") or None,
                "popularity": raw.get("popularity") or None,
            }).eq("id", s["id"]).execute()
            total += 1

            if not skip_providers:
                providers_data = (raw.get("watch/providers") or {}).get("results", {})
                country_data = providers_data.get(country, {})
                link = country_data.get("link")
                for provider in (country_data.get("flatrate") or []):
                    provider_rows.append({
                        "tv_series_id":      s["id"],
                        "provider_name":     provider.get("provider_name"),
                        "provider_logo_url": f"{LOGO_BASE}{provider['logo_path']}" if provider.get("logo_path") else None,
                        "country_code":      country,
                        "link":              link,
                    })

        except Exception as e:
            print(f"   ⚠️  tv {s['tmdb_id']}: {e}")

        if len(provider_rows) >= BATCH_SIZE:
            sb.table("watch_providers").upsert(provider_rows).execute()
            provider_rows = []

        if i % 100 == 0:
            print(f"   ↳ {i} TV series processed")
        time.sleep(SLEEP_S)

    if provider_rows:
        sb.table("watch_providers").upsert(provider_rows).execute()

    print(f"✅  TV done — {total} updated")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--country", default="US")
    ap.add_argument("--skip-providers", action="store_true")
    args = ap.parse_args()

    init_tmdb()
    sb = init_supabase()
    backfill_movies(sb, args.country, args.skip_providers)
    backfill_tv(sb, args.country, args.skip_providers)


if __name__ == "__main__":
    main()
