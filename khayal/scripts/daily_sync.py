"""Daily TMDB sync script — fetches trending/popular content and upserts to Supabase."""

from __future__ import annotations

import os
import sys
import time
from typing import Any


TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"
_DEFAULT_MAX_PAGES = 3
_MAX_RETRIES = 3
_RETRY_STATUSES = {429, 500, 502, 503, 504}


def get_env(key: str) -> str:
    """Return required environment variable or raise."""
    value = os.environ.get(key, "")
    if not value:
        raise RuntimeError(f"Required env var {key!r} is not set")
    return value


def build_tmdb_headers(api_key: str) -> dict[str, str]:
    """Build TMDB request headers."""
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def build_media_record(raw: dict[str, Any], media_type: str) -> dict[str, Any]:
    """Normalise a raw TMDB item into a Supabase-ready record."""
    title: str = raw.get("title") or raw.get("name") or ""
    return {
        "tmdb_id": int(raw["id"]),
        "media_type": media_type,
        "title": title,
        "overview": raw.get("overview", ""),
        "poster_path": raw.get("poster_path") or "",
        "backdrop_path": raw.get("backdrop_path") or "",
        "vote_average": float(raw.get("vote_average", 0.0)),
        "popularity": float(raw.get("popularity", 0.0)),
        "release_date": raw.get("release_date") or raw.get("first_air_date") or "",
        "genre_ids": raw.get("genre_ids", []),
    }


def _fetch_page(
    url: str,
    headers: dict[str, str],
    page: int,
    httpx: Any,
) -> dict[str, Any]:
    """Fetch a single TMDB page with retry + exponential backoff on 429/5xx."""
    last_exc: Exception | None = None
    for attempt in range(1, _MAX_RETRIES + 1):
        response = httpx.get(url, headers=headers, params={"page": page}, timeout=30)
        status = response.status_code
        print(f"[sync] page={page} status={status} attempt={attempt}")
        if status not in _RETRY_STATUSES:
            response.raise_for_status()
            data: dict[str, Any] = response.json()
            return data
        wait = 2 ** (attempt - 1)
        print(
            f"[sync] page={page} retryable status={status} — waiting {wait}s "
            f"(attempt {attempt}/{_MAX_RETRIES})"
        )
        if attempt < _MAX_RETRIES:
            time.sleep(wait)
        else:
            print(
                f"[sync] page={page} failed after {_MAX_RETRIES} attempts "
                f"(last status={status})"
            )
            response.raise_for_status()
            last_exc = RuntimeError(
                f"TMDB request failed: page={page} status={status}"
            )
    # unreachable — raise_for_status() would have raised above
    raise last_exc or RuntimeError("Unexpected retry loop exit")  # pragma: no cover


def fetch_trending(
    media_type: str,
    time_window: str,
    api_key: str,
    max_pages: int = _DEFAULT_MAX_PAGES,
) -> list[dict[str, Any]]:
    """Fetch trending items from TMDB across multiple pages (requires network).

    Iterates pages 1..max_pages (or until TMDB reports no more results).
    Each page request retries up to _MAX_RETRIES times with exponential backoff
    on 429 / 5xx responses.
    """
    try:
        import httpx
    except ImportError as exc:
        raise RuntimeError("httpx is required: pip install httpx") from exc

    url = f"{TMDB_BASE_URL}/trending/{media_type}/{time_window}"
    headers = build_tmdb_headers(api_key)
    records: list[dict[str, Any]] = []

    for page in range(1, max_pages + 1):
        data = _fetch_page(url, headers, page, httpx)
        results = data.get("results", [])
        total_pages: int = int(data.get("total_pages", 1))
        records.extend(build_media_record(item, media_type) for item in results)
        print(
            f"[sync] {media_type} page={page}/{min(max_pages, total_pages)} "
            f"fetched={len(results)} cumulative={len(records)}"
        )
        if not results or page >= total_pages:
            break

    return records


def upsert_records(
    records: list[dict[str, Any]],
    supabase_url: str,
    service_key: str,
) -> int:
    """Upsert records into Supabase media table. Returns count upserted."""
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase is required: pip install supabase") from exc

    client = create_client(supabase_url, service_key)
    if not records:
        return 0
    result = (
        client.table("media")
        .upsert(records, on_conflict="tmdb_id,media_type")
        .execute()
    )
    data: list[Any] = list(result.data) if result.data else []
    return len(data)


def run_sync() -> None:
    """Entry point — sync trending movies and TV shows."""
    tmdb_key = get_env("TMDB_API_KEY")
    supabase_url = get_env("SUPABASE_URL")
    service_key = get_env("SUPABASE_SERVICE_KEY")
    max_pages = int(os.environ.get("TMDB_MAX_PAGES", str(_DEFAULT_MAX_PAGES)))

    total = 0
    for media_type in ("movie", "tv"):
        records = fetch_trending(media_type, "day", tmdb_key, max_pages=max_pages)
        count = upsert_records(records, supabase_url, service_key)
        total += count
        print(f"[sync] {media_type}: upserted {count} records")

    print(f"[sync] done — total {total} records")


if __name__ == "__main__":
    try:
        run_sync()
    except RuntimeError as exc:
        print(f"[sync] error: {exc}", file=sys.stderr)
        sys.exit(1)
