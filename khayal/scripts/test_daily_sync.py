"""Unit tests for daily_sync.py — all I/O mocked, no network required."""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from daily_sync import (
    build_media_record,
    build_tmdb_headers,
    get_env,
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
# fetch_trending — mocked
# ---------------------------------------------------------------------------


def test_fetch_trending_calls_tmdb_endpoint() -> None:
    import sys
    from daily_sync import fetch_trending

    mock_response = MagicMock()
    mock_response.json.return_value = {
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
        ]
    }
    mock_response.raise_for_status = MagicMock()

    mock_httpx = MagicMock()
    mock_httpx.get.return_value = mock_response

    with patch.dict(sys.modules, {"httpx": mock_httpx}):
        records = fetch_trending("movie", "day", "key123")

    assert len(records) == 1
    assert records[0]["tmdb_id"] == 1
    assert records[0]["title"] == "Test Movie"


def test_fetch_trending_raises_on_missing_httpx() -> None:
    import builtins
    import importlib

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
# upsert_records — mocked
# ---------------------------------------------------------------------------


def test_upsert_records_returns_zero_for_empty_list() -> None:
    from daily_sync import upsert_records

    with patch.dict(
        "sys.modules",
        {"supabase": MagicMock()},
    ):
        count = upsert_records([], "https://example.supabase.co", "key")

    assert count == 0


def test_upsert_records_calls_supabase_upsert() -> None:
    from daily_sync import upsert_records

    mock_client = MagicMock()
    mock_client.table.return_value.upsert.return_value.execute.return_value.data = [
        {"id": 1},
        {"id": 2},
    ]

    mock_supabase_module = MagicMock()
    mock_supabase_module.create_client.return_value = mock_client

    records = [{"tmdb_id": 1, "media_type": "movie", "title": "A"}, {"tmdb_id": 2, "media_type": "movie", "title": "B"}]

    with patch.dict("sys.modules", {"supabase": mock_supabase_module}):
        count = upsert_records(records, "https://x.supabase.co", "key")

    assert count == 2
