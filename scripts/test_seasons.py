#!/usr/bin/env python3
"""Tests for season seeding logic."""
import pytest

POSTER_BASE = "https://image.tmdb.org/t/p/w300"


def transform_season(s: dict, tv_series_id: int) -> dict | None:
    num = s.get("season_number")
    if num is None:
        return None
    return {
        "tv_series_id":   tv_series_id,
        "season_number":  num,
        "name":           s.get("name") or f"Season {num}",
        "overview":       s.get("overview") or None,
        "air_date":       s.get("air_date") or None,
        "episode_count":  s.get("episode_count") or None,
        "poster_url":     f"{POSTER_BASE}{s['poster_path']}" if s.get("poster_path") else None,
        "tmdb_season_id": s.get("id"),
    }


class TestTransformSeason:
    def test_basic_season(self):
        row = transform_season({
            "id": 5000, "season_number": 1, "name": "Season 1",
            "air_date": "2020-01-01", "episode_count": 10,
            "poster_path": "/abc.jpg", "overview": "Great season"
        }, tv_series_id=99)
        assert row["season_number"] == 1
        assert row["tv_series_id"] == 99
        assert row["episode_count"] == 10
        assert row["poster_url"] == f"{POSTER_BASE}/abc.jpg"
        assert row["tmdb_season_id"] == 5000

    def test_no_season_number_returns_none(self):
        row = transform_season({"name": "Specials"}, tv_series_id=1)
        assert row is None

    def test_missing_poster_is_none(self):
        row = transform_season({"season_number": 2, "poster_path": None}, tv_series_id=1)
        assert row["poster_url"] is None

    def test_missing_name_uses_default(self):
        row = transform_season({"season_number": 3, "name": ""}, tv_series_id=1)
        assert row["name"] == "Season 3"

    def test_missing_overview_is_none(self):
        row = transform_season({"season_number": 1, "overview": ""}, tv_series_id=1)
        assert row["overview"] is None

    def test_season_zero_allowed(self):
        row = transform_season({"season_number": 0, "name": "Specials"}, tv_series_id=1)
        assert row is not None
        assert row["season_number"] == 0

    def test_air_date_none_when_missing(self):
        row = transform_season({"season_number": 1}, tv_series_id=1)
        assert row["air_date"] is None

    def test_tv_series_id_propagated(self):
        row = transform_season({"season_number": 1}, tv_series_id=42)
        assert row["tv_series_id"] == 42


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
