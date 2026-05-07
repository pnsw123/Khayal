#!/usr/bin/env python3
"""Tests for extra TMDB fields backfill logic."""
import pytest

LOGO_BASE = "https://image.tmdb.org/t/p/w92"


def extract_movie_update(raw: dict) -> dict:
    return {
        "tagline":    raw.get("tagline") or None,
        "budget":     raw.get("budget") or None,
        "revenue":    raw.get("revenue") or None,
        "popularity": raw.get("popularity") or None,
    }


def extract_providers(raw: dict, country: str) -> list[dict]:
    providers_data = (raw.get("watch/providers") or {}).get("results", {})
    country_data = providers_data.get(country, {})
    link = country_data.get("link")
    rows = []
    for p in (country_data.get("flatrate") or []):
        rows.append({
            "provider_name":     p.get("provider_name"),
            "provider_logo_url": f"{LOGO_BASE}{p['logo_path']}" if p.get("logo_path") else None,
            "country_code":      country,
            "link":              link,
        })
    return rows


class TestMovieUpdate:
    def test_full_fields(self):
        raw = {"tagline": "Just keep swimming", "budget": 1000000, "revenue": 5000000, "popularity": 42.5}
        u = extract_movie_update(raw)
        assert u["tagline"] == "Just keep swimming"
        assert u["budget"] == 1000000
        assert u["popularity"] == 42.5

    def test_empty_tagline_becomes_none(self):
        u = extract_movie_update({"tagline": "", "budget": 0})
        assert u["tagline"] is None

    def test_zero_budget_becomes_none(self):
        u = extract_movie_update({"budget": 0})
        assert u["budget"] is None

    def test_missing_fields_are_none(self):
        u = extract_movie_update({})
        assert u == {"tagline": None, "budget": None, "revenue": None, "popularity": None}


class TestWatchProviders:
    SAMPLE = {
        "watch/providers": {
            "results": {
                "US": {
                    "link": "https://www.themoviedb.org/movie/1/watch",
                    "flatrate": [
                        {"provider_name": "Netflix", "logo_path": "/netflix.jpg", "provider_id": 8},
                        {"provider_name": "Amazon Prime", "logo_path": "/prime.jpg", "provider_id": 9},
                    ]
                }
            }
        }
    }

    def test_us_providers_extracted(self):
        rows = extract_providers(self.SAMPLE, "US")
        assert len(rows) == 2
        assert rows[0]["provider_name"] == "Netflix"
        assert rows[0]["country_code"] == "US"
        assert rows[0]["link"] == "https://www.themoviedb.org/movie/1/watch"

    def test_logo_url_built(self):
        rows = extract_providers(self.SAMPLE, "US")
        assert rows[0]["provider_logo_url"] == f"{LOGO_BASE}/netflix.jpg"

    def test_missing_country_returns_empty(self):
        rows = extract_providers(self.SAMPLE, "DE")
        assert rows == []

    def test_no_providers_returns_empty(self):
        rows = extract_providers({}, "US")
        assert rows == []

    def test_missing_logo_becomes_none(self):
        raw = {
            "watch/providers": {
                "results": {
                    "US": {"flatrate": [{"provider_name": "Hulu", "logo_path": None}]}
                }
            }
        }
        rows = extract_providers(raw, "US")
        assert rows[0]["provider_logo_url"] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
