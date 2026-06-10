"""Unit tests for daily_sync.py — all I/O mocked, no network required."""

from __future__ import annotations

import os
import sys
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from daily_sync import (
    _DEFAULT_MAX_PAGES,
    build_media_record,
    build_tmdb_headers,
    fetch_trending,
    fetch_trending_pages,
    get_env,
    upsert_records,
)

# ---------------------------------------------------------------------------
# get_env
# ---------------------------------------------------------------------------


def test_get_env_returns_value_when_set() -> None:
    with patch.dict(os.environ, {"TEST_KEY": "hello"}):
        assert get_env("TEST_KEY") == "hello"


def test_get_env_raises_when_missing() -> None:
    env_copy = {k: v for k, v in os.environ.items() if k != "MISSING_KEY"}
    with patch.dict(os.environ, env_copy, clear=True):
        with pytest.raises(RuntimeError, match="MISSING_KEY"):
            get_env("MISSING_KEY")


def test_get_env_raises_when_empty_string() -> None:
    with patch.dict(os.environ, {"EMPTY_KEY": ""}):
        with pytest.raises(RuntimeError, match="EMPTY_KEY"):
            get_env("EMPTY_KEY")


# ---------------------------------------------------------------------------
# build_tmdb_headers
# ---------------------------------------------------------------------------


def test_build_tmdb_headers_contains_bearer() -> None:
    headers = build_tmdb_headers("secret123")
    assert headers["Authorization"] == "Bearer secret123"
    assert headers["Content-Type"] == "application/json"


def test_build_tmdb_headers_empty_key() -> None:
    headers = build_tmdb_headers("")
    assert headers["Authorization"] == "Bearer "


# ---------------------------------------------------------------------------
# build_media_record
# ---------------------------------------------------------------------------


def _raw_movie() -> dict[str, Any]:
    return {
        "id": 42,
        "title": "Inception",
        "overview": "Dreams within dreams",
        "poster_path": "/poster.jpg",
        "backdrop_path": "/backdrop.jpg",
        "vote_average": 8.8,
        "popularity": 120.5,
        "release_date": "2010-07-16",
        "genre_ids": [28, 878],
    }


def test_build_media_record_movie() -> None:
    record = build_media_record(_raw_movie(), "movie")
    assert record["tmdb_id"] == 42
    assert record["media_type"] == "movie"
    assert record["title"] == "Inception"
    assert record["vote_average"] == 8.8
    assert record["genre_ids"] == [28, 878]


def test_build_media_record_tv_uses_name() -> None:
    raw: dict[str, Any] = {
        "id": 99,
        "name": "Breaking Bad",
        "overview": "Chemistry teacher",
        "poster_path": None,
        "backdrop_path": None,
        "vote_average": 9.5,
        "popularity": 200.0,
        "first_air_date": "2008-01-20",
        "genre_ids": [18],
    }
    record = build_media_record(raw, "tv")
    assert record["title"] == "Breaking Bad"
    assert record["media_type"] == "tv"
    assert record["release_date"] == "2008-01-20"


def test_build_media_record_missing_optional_fields() -> None:
    raw: dict[str, Any] = {"id": 1}
    record = build_media_record(raw, "movie")
    assert record["tmdb_id"] == 1
    assert record["title"] == ""
    assert record["overview"] == ""
    assert record["poster_path"] == ""
    assert record["vote_average"] == 0.0
    assert record["popularity"] == 0.0
    assert record["release_date"] == ""
    assert record["genre_ids"] == []


def test_build_media_record_none_poster_becomes_empty_string() -> None:
    raw = {**_raw_movie(), "poster_path": None, "backdrop_path": None}
    record = build_media_record(raw, "movie")
    assert record["poster_path"] == ""
    assert record["backdrop_path"] == ""


# ---------------------------------------------------------------------------
# fetch_trending — mocked — single page
# ---------------------------------------------------------------------------


def _make_httpx_mock(pages_data: list[dict[str, Any]]) -> MagicMock:
    """Return httpx mock whose .get() cycles through pages_data responses."""
    responses = []
    for data in pages_data:
        resp = MagicMock()
        resp.status_code = 200
        resp.json.return_value = data
        resp.raise_for_status = MagicMock()
        responses.append(resp)
    mock_httpx = MagicMock()
    mock_httpx.get.side_effect = responses
    return mock_httpx


def test_fetch_trending_calls_tmdb_endpoint() -> None:
    page1 = {
        "results": [
            {
                "id": 1,
                "title": "Test Movie",
                "overview": "desc",
                "poster_path": "/p.jpg",
                "backdrop_path": "/b.jpg",
                "vote_average": 7.0,
                "popularity": 50.0,
                "release_date": "2024-01-01",
                "genre_ids": [28],
            }
        ],
        "total_pages": 1,
    }
    mock_httpx = _make_httpx_mock([page1])

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key123", max_pages=1)

    assert len(records) == 1
    assert records[0]["tmdb_id"] == 1
    assert records[0]["title"] == "Test Movie"


def test_fetch_trending_raises_on_missing_httpx() -> None:
    import builtins

    real_import = builtins.__import__

    def mock_import(name: str, *args: Any, **kwargs: Any) -> Any:
        if name == "httpx":
            raise ImportError("No module named 'httpx'")
        return real_import(name, *args, **kwargs)

    with patch("builtins.__import__", side_effect=mock_import):
        from daily_sync import fetch_trending as _fetch  # noqa: PLC0415

        with pytest.raises(RuntimeError, match="httpx is required"):
            _fetch("movie", "day", "key")


# ---------------------------------------------------------------------------
# fetch_trending — pagination
# ---------------------------------------------------------------------------


def _make_item(n: int) -> dict[str, Any]:
    return {
        "id": n,
        "title": f"Movie {n}",
        "overview": "",
        "poster_path": "",
        "backdrop_path": "",
        "vote_average": 5.0,
        "popularity": 10.0,
        "release_date": "2024-01-01",
        "genre_ids": [],
    }


def test_fetch_trending_paginates_multiple_pages() -> None:
    """Should fetch pages 1 and 2 when total_pages=2 and max_pages>=2."""
    page1 = {"results": [_make_item(1), _make_item(2)], "total_pages": 2}
    page2 = {"results": [_make_item(3), _make_item(4)], "total_pages": 2}
    mock_httpx = _make_httpx_mock([page1, page2])

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key", max_pages=3)

    assert len(records) == 4
    assert mock_httpx.get.call_count == 2
    # page params
    calls = mock_httpx.get.call_args_list
    assert calls[0][1]["params"]["page"] == 1
    assert calls[1][1]["params"]["page"] == 2


def test_fetch_trending_respects_max_pages_limit() -> None:
    """Should stop at max_pages even if TMDB reports more pages available."""
    pages = [{"results": [_make_item(i * 10)], "total_pages": 100} for i in range(1, 4)]
    mock_httpx = _make_httpx_mock(pages)

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key", max_pages=3)

    assert len(records) == 3
    assert mock_httpx.get.call_count == 3


def test_fetch_trending_stops_when_results_empty() -> None:
    """Should stop paginating when TMDB returns empty results list."""
    item = {"id": 1, "title": "M", "overview": "", "poster_path": "",
            "backdrop_path": "", "vote_average": 5.0, "popularity": 1.0,
            "release_date": "", "genre_ids": []}
    page1 = {"results": [item], "total_pages": 5}
    page2 = {"results": [], "total_pages": 5}
    mock_httpx = _make_httpx_mock([page1, page2])

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key", max_pages=5)

    assert len(records) == 1
    assert mock_httpx.get.call_count == 2


def test_fetch_trending_default_max_pages_is_three() -> None:
    """Default max_pages should be _DEFAULT_MAX_PAGES (3)."""
    assert _DEFAULT_MAX_PAGES == 3
    item = {"id": 1, "title": "M", "overview": "", "poster_path": "",
            "backdrop_path": "", "vote_average": 5.0, "popularity": 1.0,
            "release_date": "", "genre_ids": []}
    # 3 pages, total_pages=3 — expect exactly 3 calls
    pages = [{"results": [item], "total_pages": 3} for _ in range(3)]
    mock_httpx = _make_httpx_mock(pages)

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key")  # no max_pages arg

    assert mock_httpx.get.call_count == 3
    assert len(records) == 3


# ---------------------------------------------------------------------------
# fetch_trending — retry logic
# ---------------------------------------------------------------------------


def test_fetch_trending_retries_on_429() -> None:
    """429 response → retries with backoff, succeeds on 3rd attempt."""
    fail_resp = MagicMock()
    fail_resp.status_code = 429
    fail_resp.raise_for_status.side_effect = Exception("429 Too Many Requests")

    ok_resp = MagicMock()
    ok_resp.status_code = 200
    ok_resp.raise_for_status = MagicMock()
    ok_resp.json.return_value = {
        "results": [{"id": 1, "title": "M", "overview": "", "poster_path": "",
                     "backdrop_path": "", "vote_average": 5.0, "popularity": 1.0,
                     "release_date": "", "genre_ids": []}],
        "total_pages": 1,
    }

    mock_httpx = MagicMock()
    mock_httpx.get.side_effect = [fail_resp, fail_resp, ok_resp]

    with patch("daily_sync.time.sleep") as mock_sleep, \
         patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key", max_pages=1)

    assert len(records) == 1
    assert mock_httpx.get.call_count == 3
    # slept twice: 1s after attempt 1, 2s after attempt 2
    assert mock_sleep.call_count == 2
    mock_sleep.assert_any_call(1)
    mock_sleep.assert_any_call(2)


def test_fetch_trending_retries_on_5xx() -> None:
    """500 response → retries, succeeds on 2nd attempt."""
    fail_resp = MagicMock()
    fail_resp.status_code = 503
    fail_resp.raise_for_status.side_effect = Exception("503 Service Unavailable")

    ok_resp = MagicMock()
    ok_resp.status_code = 200
    ok_resp.raise_for_status = MagicMock()
    ok_resp.json.return_value = {
        "results": [],
        "total_pages": 1,
    }

    mock_httpx = MagicMock()
    mock_httpx.get.side_effect = [fail_resp, ok_resp]

    with patch("daily_sync.time.sleep") as mock_sleep, \
         patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("tv", "day", "key", max_pages=1)

    assert records == []
    assert mock_httpx.get.call_count == 2
    mock_sleep.assert_called_once_with(1)


def test_fetch_trending_raises_after_max_retries_exhausted() -> None:
    """Persistent 429 → raises after _MAX_RETRIES attempts."""
    fail_resp = MagicMock()
    fail_resp.status_code = 429
    fail_resp.raise_for_status.side_effect = Exception("429 Too Many Requests")

    mock_httpx = MagicMock()
    mock_httpx.get.return_value = fail_resp

    with patch("daily_sync.time.sleep"), \
         patch.dict(sys.modules, {"httpx": mock_httpx}):
        with pytest.raises(Exception, match="429"):  # noqa: B017
            fetch_trending("movie", "day", "key", max_pages=1)

    assert mock_httpx.get.call_count == 3  # _MAX_RETRIES


# ---------------------------------------------------------------------------
# fetch_trending — TMDB_MAX_PAGES env var (via run_sync)
# ---------------------------------------------------------------------------


def test_run_sync_reads_tmdb_max_pages_env() -> None:
    """TMDB_MAX_PAGES env var controls pagination depth passed to fetch_trending_pages."""
    from daily_sync import run_sync

    captured: list[int] = []

    def fake_fetch_pages(  # type: ignore[misc]
        media_type: str, time_window: str, api_key: str, max_pages: int = 3
    ) -> tuple[list[Any], list[int]]:
        captured.append(max_pages)
        return [], []

    def fake_upsert(records: list[Any], url: str, key: str) -> int:
        return 0

    env = {
        "TMDB_API_KEY": "k",
        "SUPABASE_URL": "https://x.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "sk",
        "TMDB_MAX_PAGES": "7",
    }
    with patch.dict(os.environ, env), \
         patch("daily_sync.fetch_trending_pages", side_effect=fake_fetch_pages), \
         patch("daily_sync.upsert_records", side_effect=fake_upsert):
        run_sync()

    assert all(v == 7 for v in captured), f"Expected max_pages=7, got {captured}"
    assert len(captured) == 2  # movie + tv


def test_run_sync_default_max_pages_when_env_unset() -> None:
    """When TMDB_MAX_PAGES unset, default 3 used."""
    from daily_sync import run_sync

    captured: list[int] = []

    def fake_fetch_pages(  # type: ignore[misc]
        media_type: str, time_window: str, api_key: str, max_pages: int = 3
    ) -> tuple[list[Any], list[int]]:
        captured.append(max_pages)
        return [], []

    env = {
        "TMDB_API_KEY": "k",
        "SUPABASE_URL": "https://x.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "sk",
    }
    # Ensure TMDB_MAX_PAGES not present
    clean_env = {k: v for k, v in os.environ.items() if k != "TMDB_MAX_PAGES"}
    clean_env.update(env)
    with patch.dict(os.environ, clean_env, clear=True), \
         patch("daily_sync.fetch_trending_pages", side_effect=fake_fetch_pages), \
         patch("daily_sync.upsert_records", return_value=0):
        run_sync()

    assert all(v == _DEFAULT_MAX_PAGES for v in captured)


# ---------------------------------------------------------------------------
# upsert_records — mocked
# ---------------------------------------------------------------------------


def test_upsert_records_returns_zero_for_empty_list() -> None:
    with patch.dict(
        "sys.modules",
        {"supabase": MagicMock()},
    ):
        count = upsert_records([], "https://example.supabase.co", "key")

    assert count == 0


def test_upsert_records_calls_supabase_upsert() -> None:
    mock_client = MagicMock()
    mock_client.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": 1},
        {"id": 2},
    ]

    mock_supabase_module = MagicMock()
    mock_supabase_module.create_client.return_value = mock_client

    records = [
        {"tmdb_id": 1, "media_type": "movie", "title": "A"},
        {"tmdb_id": 2, "media_type": "movie", "title": "B"},
    ]

    with patch.dict("sys.modules", {"supabase": mock_supabase_module}):
        count = upsert_records(records, "https://x.supabase.co", "key")

    assert count == 2


# ---------------------------------------------------------------------------
# fetch_trending_pages — partial-failure safety (#241)
# ---------------------------------------------------------------------------


def _make_ok_response(items: list[dict[str, Any]], total_pages: int) -> MagicMock:
    resp = MagicMock()
    resp.status_code = 200
    resp.raise_for_status = MagicMock()
    resp.json.return_value = {"results": items, "total_pages": total_pages}
    return resp


def _make_rate_limit_response() -> MagicMock:
    resp = MagicMock()
    resp.status_code = 429
    resp.raise_for_status.side_effect = Exception("429 Too Many Requests")
    return resp


def test_fetch_trending_pages_returns_records_and_empty_failed_on_success() -> None:
    """All pages succeed → records returned, failed_pages empty."""
    item = _make_item(1)
    page1 = {"results": [item], "total_pages": 2}
    page2 = {"results": [_make_item(2)], "total_pages": 2}
    mock_httpx = _make_httpx_mock([page1, page2])

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records, failed = fetch_trending_pages("movie", "day", "key", max_pages=2)

    assert len(records) == 2
    assert failed == []


def test_fetch_trending_pages_skips_failed_page_and_reports_it() -> None:
    """Page 2 fails after retries → page 1 records kept, page 2 in failed_pages, page 3 fetched."""
    item1 = _make_item(1)
    item3 = _make_item(3)
    ok_resp_1 = _make_ok_response([item1], total_pages=3)
    rate_limit_resp = _make_rate_limit_response()
    ok_resp_3 = _make_ok_response([item3], total_pages=3)

    mock_httpx = MagicMock()
    # page 1 OK; page 2 fails all 3 retry attempts; page 3 OK
    mock_httpx.get.side_effect = [
        ok_resp_1,
        rate_limit_resp,
        rate_limit_resp,
        rate_limit_resp,
        ok_resp_3,
    ]

    with patch("daily_sync.time.sleep"), patch.dict(sys.modules, {"httpx": mock_httpx}):
        records, failed = fetch_trending_pages("movie", "day", "key", max_pages=3)

    assert len(records) == 2
    assert failed == [2]
    tmdb_ids = {r["tmdb_id"] for r in records}
    assert tmdb_ids == {1, 3}


def test_fetch_trending_pages_continues_after_partial_failure() -> None:
    """Pages 1 and 3 succeed; page 2 fails → records from p1+p3, failed=[2]."""
    item1 = _make_item(1)
    item3 = _make_item(3)
    ok_resp_1 = _make_ok_response([item1], total_pages=3)
    rate_limit_resp = _make_rate_limit_response()
    ok_resp_3 = _make_ok_response([item3], total_pages=3)

    mock_httpx = MagicMock()
    # page 1 ok; page 2 all 3 retries fail; page 3 ok
    mock_httpx.get.side_effect = [
        ok_resp_1,
        rate_limit_resp,
        rate_limit_resp,
        rate_limit_resp,
        ok_resp_3,
    ]

    with patch("daily_sync.time.sleep"), patch.dict(sys.modules, {"httpx": mock_httpx}):
        records, failed = fetch_trending_pages("movie", "day", "key", max_pages=3)

    assert len(records) == 2
    assert failed == [2]
    tmdb_ids = {r["tmdb_id"] for r in records}
    assert tmdb_ids == {1, 3}


def test_fetch_trending_pages_all_pages_fail_returns_empty_records() -> None:
    """All pages fail → empty records list, all pages in failed_pages."""
    rate_limit_resp = _make_rate_limit_response()
    mock_httpx = MagicMock()
    # 2 pages × 3 retries each = 6 calls
    mock_httpx.get.return_value = rate_limit_resp

    with patch("daily_sync.time.sleep"), patch.dict(sys.modules, {"httpx": mock_httpx}):
        records, failed = fetch_trending_pages("movie", "day", "key", max_pages=2)

    assert records == []
    assert failed == [1, 2]


def test_run_sync_upserts_partial_records_on_rate_limit() -> None:
    """run_sync upserts whatever pages succeeded even if later pages rate-limited."""
    from daily_sync import run_sync

    item1 = _make_item(10)
    partial_records = [build_media_record(item1, "movie")]

    def fake_fetch_pages(
        media_type: str, time_window: str, api_key: str, max_pages: int = 3
    ) -> tuple[list[Any], list[int]]:
        if media_type == "movie":
            return partial_records, [2, 3]  # page 1 ok, pages 2-3 failed
        return [], []

    upserted: list[list[Any]] = []

    def fake_upsert(records: list[Any], url: str, key: str) -> int:
        upserted.append(records)
        return len(records)

    env = {
        "TMDB_API_KEY": "k",
        "SUPABASE_URL": "https://x.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "sk",
    }
    with patch.dict(os.environ, env), \
         patch("daily_sync.fetch_trending_pages", side_effect=fake_fetch_pages), \
         patch("daily_sync.upsert_records", side_effect=fake_upsert):
        run_sync()

    # movie upsert should have received partial_records, not empty list
    assert len(upserted) == 2
    assert upserted[0] == partial_records
