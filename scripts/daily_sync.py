#!/usr/bin/env python3
"""
KHAYAL daily sync — fully automated, zero human intervention required.

What it does every night:
  1. Fetches new/current movies from TMDB (now_playing + upcoming)
  2. Fetches new/current TV series (on_the_air + airing_today)
  3. Upserts into Supabase — skips duplicates, never deletes
  4. Retries any failure up to 3× with exponential backoff
  5. Writes a structured log to .sync.log (one line per run)
  6. Always exits 0 — a bad night never kills tomorrow's run

Run manually any time:
  python scripts/daily_sync.py
  python scripts/daily_sync.py --dry-run        # no DB writes
  python scripts/daily_sync.py --days 30         # wider look-back
  python scripts/daily_sync.py --status          # show last 10 log lines

Cron (installed by setup_cron.sh):
  0 3 * * * /path/to/.venv/bin/python /path/to/scripts/daily_sync.py
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from slugify import slugify
from supabase import Client, create_client
from tmdbv3api import TMDb, Movie, TV

# ─── Paths ───────────────────────────────────────────────────────────────────

ROOT     = Path(__file__).parent.parent
ENV_FILE = ROOT / ".env"
LOG_FILE = ROOT / ".sync.log"

load_dotenv(ENV_FILE)

# ─── Logging (file + stdout) ─────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("khayal-sync")

# ─── Constants ────────────────────────────────────────────────────────────────

POSTER_BASE    = "https://image.tmdb.org/t/p/w500"
BACKDROP_BASE  = "https://image.tmdb.org/t/p/original"
BATCH_SIZE     = 50
MAX_PAGES      = 10   # per source per content-type (200 results max)
RETRY_ATTEMPTS = 3
RETRY_DELAY    = 2.0  # seconds (doubles on each retry)

TV_STATUS_MAP = {
    "Returning Series": "ongoing",
    "Ended":            "ended",
    "Planned":          "planned",
    "Canceled":         "cancelled",
    "Cancelled":        "cancelled",
    "In Production":    "planned",
    "Pilot":            "planned",
}


# ─── Retry helper ────────────────────────────────────────────────────────────

def with_retry(fn, label: str = ""):
    """Call fn() up to RETRY_ATTEMPTS times. Return result or None on total failure."""
    delay = RETRY_DELAY
    for attempt in range(1, RETRY_ATTEMPTS + 1):
        try:
            return fn()
        except Exception as exc:
            if attempt == RETRY_ATTEMPTS:
                log.warning("  ⚠️  %s failed after %d attempts: %s", label, RETRY_ATTEMPTS, exc)
                return None
            log.debug("  ↩️  %s attempt %d failed (%s) — retrying in %.0fs…", label, attempt, exc, delay)
            time.sleep(delay)
            delay *= 2
    return None


# ─── Clients ────────────────────────────────────────────────────────────────

def init_tmdb() -> TMDb:
    key = os.environ.get("TMDB_API_KEY")
    if not key:
        log.error("TMDB_API_KEY not set in %s", ENV_FILE)
        sys.exit(1)
    tmdb = TMDb()
    tmdb.api_key  = key
    tmdb.language = "en"
    return tmdb


def init_supabase() -> Client:
    ref = os.environ.get("SUPABASE_PROJECT_REF")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not ref or not key:
        log.error("SUPABASE_PROJECT_REF or SUPABASE_SERVICE_ROLE_KEY not set in %s", ENV_FILE)
        sys.exit(1)
    return create_client(f"https://{ref}.supabase.co", key)


# ─── Transform helpers ───────────────────────────────────────────────────────

def _raw(obj: Any) -> dict:
    if hasattr(obj, "_json"):
        return obj._json
    if isinstance(obj, dict):
        return obj
    try:
        return dict(obj)
    except Exception:
        return {}


def make_slug(title: str, year: str | int | None) -> str:
    base = slugify(title or "untitled", max_length=100)
    return f"{base}-{year}" if year else base


def transform_movie(m: dict) -> dict | None:
    title = m.get("title")
    if not title:
        return None
    release = m.get("release_date") or None
    year    = release.split("-")[0] if release else None

    age_rating = None
    for rd in ((m.get("release_dates") or {}).get("results") or []):
        if rd.get("iso_3166_1") == "US":
            for entry in (rd.get("release_dates") or []):
                cert = (entry.get("certification") or "").strip()
                if cert:
                    age_rating = cert
                    break
            if age_rating:
                break

    countries = m.get("production_countries") or []
    country   = countries[0].get("iso_3166_1") if countries else None

    return {
        "title":             title[:500],
        "slug":              make_slug(title, year),
        "tmdb_id":           m.get("id"),
        "release_date":      release or None,
        "runtime_minutes":   m.get("runtime") or None,
        "age_rating":        age_rating,
        "original_language": m.get("original_language"),
        "country":           country,
        "overview":          m.get("overview") or None,
        "poster_url":        f"{POSTER_BASE}{m['poster_path']}"     if m.get("poster_path")   else None,
        "backdrop_url":      f"{BACKDROP_BASE}{m['backdrop_path']}" if m.get("backdrop_path") else None,
    }


def transform_tv(t: dict) -> dict | None:
    title = t.get("name")
    if not title:
        return None
    first_air = t.get("first_air_date") or None
    year      = first_air.split("-")[0] if first_air else None
    status    = TV_STATUS_MAP.get(t.get("status") or "", "planned")

    return {
        "title":          title[:500],
        "slug":           make_slug(title, year),
        "tmdb_id":        t.get("id"),
        "first_air_date": first_air or None,
        "last_air_date":  t.get("last_air_date") or None,
        "status":         status,
        "overview":       t.get("overview") or None,
        "poster_url":     f"{POSTER_BASE}{t['poster_path']}"     if t.get("poster_path")   else None,
        "backdrop_url":   f"{BACKDROP_BASE}{t['backdrop_path']}" if t.get("backdrop_path") else None,
    }


# ─── Fetch from TMDB ────────────────────────────────────────────────────────

def fetch_new_movies(days: int) -> list[dict]:
    api    = Movie()
    cutoff = date.today() - timedelta(days=days)
    seen:  set[int]  = set()
    rows:  list[dict] = []

    for source in ("now_playing", "upcoming"):
        for page in range(1, MAX_PAGES + 1):
            results = with_retry(
                lambda src=source, p=page: api.now_playing(page=p) if src == "now_playing" else api.upcoming(page=p),
                label=f"movie/{source} page {page}",
            )
            if not results:
                break

            found_any = False
            for r in results:
                raw = _raw(r)
                tmdb_id = raw.get("id")
                if not tmdb_id or tmdb_id in seen:
                    continue
                rel = raw.get("release_date") or ""
                if rel:
                    try:
                        if date.fromisoformat(rel) < cutoff:
                            continue
                    except ValueError:
                        pass
                seen.add(tmdb_id)
                found_any = True
                time.sleep(0.05)
                detail = with_retry(
                    lambda mid=tmdb_id: _raw(api.details(mid, append_to_response="release_dates")),
                    label=f"movie/{tmdb_id} detail",
                )
                if detail:
                    row = transform_movie(detail)
                    if row:
                        rows.append(row)

            if not found_any:
                break

    return rows


def fetch_new_tv(days: int) -> list[dict]:
    api    = TV()
    cutoff = date.today() - timedelta(days=days)
    seen:  set[int]  = set()
    rows:  list[dict] = []

    for source in ("on_the_air", "airing_today"):
        for page in range(1, MAX_PAGES + 1):
            results = with_retry(
                lambda src=source, p=page: api.on_the_air(page=p) if src == "on_the_air" else api.airing_today(page=p),
                label=f"tv/{source} page {page}",
            )
            if not results:
                break

            found_any = False
            for r in results:
                raw = _raw(r)
                tmdb_id = raw.get("id")
                if not tmdb_id or tmdb_id in seen:
                    continue
                first_air = raw.get("first_air_date") or ""
                if first_air:
                    try:
                        if date.fromisoformat(first_air) < cutoff:
                            continue
                    except ValueError:
                        pass
                seen.add(tmdb_id)
                found_any = True
                time.sleep(0.05)
                detail = with_retry(
                    lambda tid=tmdb_id: _raw(api.details(tid)),
                    label=f"tv/{tmdb_id} detail",
                )
                if detail:
                    row = transform_tv(detail)
                    if row:
                        rows.append(row)

            if not found_any:
                break

    return rows


# ─── Upsert to Supabase ──────────────────────────────────────────────────────

def upsert_batch(sb: Client, table: str, rows: list[dict]) -> tuple[int, int]:
    inserted = skipped = 0
    for i in range(0, len(rows), BATCH_SIZE):
        chunk = rows[i : i + BATCH_SIZE]
        result = with_retry(
            lambda c=chunk: sb.table(table).upsert(c, on_conflict="tmdb_id", ignore_duplicates=True).execute(),
            label=f"upsert {table} chunk {i//BATCH_SIZE + 1}",
        )
        if result is not None:
            inserted += len(chunk)
        else:
            skipped += len(chunk)
    return inserted, skipped


# ─── Status view ─────────────────────────────────────────────────────────────

def show_status(n: int = 10) -> None:
    if not LOG_FILE.exists():
        print("No sync log found yet — sync has never run.")
        return
    lines = LOG_FILE.read_text().splitlines()
    print(f"\nLast {min(n, len(lines))} log entries ({LOG_FILE}):\n")
    for line in lines[-n:]:
        print(" ", line)
    print()


# ─── Main ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="KHAYAL daily TMDB sync")
    parser.add_argument("--days",    type=int, default=14)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--status",  action="store_true", help="Show recent log entries and exit")
    args = parser.parse_args()

    if args.status:
        show_status()
        return

    run_date = date.today().isoformat()
    log.info("━━━  KHAYAL daily sync  %s  (look-back %d days)  ━━━", run_date, args.days)

    init_tmdb()
    sb = None if args.dry_run else init_supabase()

    # ── Movies ──
    log.info("📽️   Fetching movies…")
    movies = fetch_new_movies(args.days)
    log.info("     Found %d movies", len(movies))

    if args.dry_run:
        for m in movies[:5]:
            log.info("     [dry] %s (%s)", m["title"], m.get("release_date", "?"))
        if len(movies) > 5:
            log.info("     … and %d more", len(movies) - 5)
        movie_ins = len(movies)
    else:
        movie_ins, movie_skp = upsert_batch(sb, "movies", movies)
        log.info("     ✅  %d upserted, %d skipped", movie_ins, movie_skp)

    # ── TV ──
    log.info("📺   Fetching TV series…")
    tv_rows = fetch_new_tv(args.days)
    log.info("     Found %d TV series", len(tv_rows))

    if args.dry_run:
        for t in tv_rows[:5]:
            log.info("     [dry] %s (%s)", t["title"], t.get("first_air_date", "?"))
        if len(tv_rows) > 5:
            log.info("     … and %d more", len(tv_rows) - 5)
        tv_ins = len(tv_rows)
    else:
        tv_ins, tv_skp = upsert_batch(sb, "tv_series", tv_rows)
        log.info("     ✅  %d upserted, %d skipped", tv_ins, tv_skp)

    log.info("━━━  Done — movies:%d  tv:%d  date:%s  ━━━", movie_ins, tv_ins, run_date)


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception as exc:
        # Never crash the cron — log the error and exit cleanly
        log.error("Unexpected error (sync will retry tomorrow): %s", exc, exc_info=True)
        sys.exit(0)
