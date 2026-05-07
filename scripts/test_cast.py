#!/usr/bin/env python3
"""Tests for cast seeding logic."""
import pytest
from unittest.mock import MagicMock


def make_person_slug(name: str, tmdb_id: int) -> str:
    from slugify import slugify
    base = slugify(name or "unknown", max_length=80)
    return f"{base}-{tmdb_id}"


def process_credits(raw_credits: dict, our_id: int, id_key: str,
                    person_map: dict[int, int], top_cast: int) -> list[dict]:
    links = []
    for member in (raw_credits.get("cast") or [])[:top_cast]:
        pid = person_map.get(member.get("id"))
        if pid:
            links.append({
                id_key:           our_id,
                "person_id":      pid,
                "role":           "cast",
                "character_name": (member.get("character") or "")[:200] or None,
                "credit_order":   member.get("order", 999),
            })
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
            break
    return links


class TestPersonSlug:
    def test_basic(self):
        s = make_person_slug("Tom Hanks", 31)
        assert s == "tom-hanks-31"

    def test_special_chars(self):
        s = make_person_slug("Léa Seydoux", 12345)
        assert "12345" in s

    def test_empty_name(self):
        s = make_person_slug("", 1)
        assert s == "unknown-1"


class TestProcessCredits:
    SAMPLE_CREDITS = {
        "cast": [
            {"id": 1, "name": "Actor A", "character": "Hero", "order": 0},
            {"id": 2, "name": "Actor B", "character": "Villain", "order": 1},
            {"id": 3, "name": "Actor C", "character": "Friend", "order": 2},
        ],
        "crew": [
            {"id": 10, "name": "Director X", "job": "Director"},
            {"id": 11, "name": "Producer Y", "job": "Producer"},
        ]
    }

    def test_cast_links_built(self):
        person_map = {1: 101, 2: 102, 3: 103, 10: 110}
        links = process_credits(self.SAMPLE_CREDITS, 999, "movie_id", person_map, top_cast=10)
        cast_links = [l for l in links if l["role"] == "cast"]
        assert len(cast_links) == 3
        assert cast_links[0]["character_name"] == "Hero"

    def test_top_cast_limit(self):
        person_map = {1: 101, 2: 102, 3: 103}
        links = process_credits(self.SAMPLE_CREDITS, 999, "movie_id", person_map, top_cast=2)
        cast_links = [l for l in links if l["role"] == "cast"]
        assert len(cast_links) == 2

    def test_director_included(self):
        person_map = {1: 101, 10: 110}
        links = process_credits(self.SAMPLE_CREDITS, 999, "movie_id", person_map, top_cast=10)
        directors = [l for l in links if l.get("job") == "Director"]
        assert len(directors) == 1
        assert directors[0]["person_id"] == 110
        assert directors[0]["credit_order"] == 0

    def test_producer_excluded(self):
        person_map = {11: 111}
        links = process_credits(self.SAMPLE_CREDITS, 1, "movie_id", person_map, top_cast=10)
        jobs = [l.get("job") for l in links]
        assert "Producer" not in jobs

    def test_missing_person_skipped(self):
        person_map = {}  # no one in map
        links = process_credits(self.SAMPLE_CREDITS, 1, "movie_id", person_map, top_cast=10)
        assert links == []

    def test_tv_id_key(self):
        person_map = {1: 101}
        links = process_credits(self.SAMPLE_CREDITS, 50, "tv_series_id", person_map, top_cast=1)
        assert links[0]["tv_series_id"] == 50
        assert "movie_id" not in links[0]

    def test_empty_credits(self):
        links = process_credits({}, 1, "movie_id", {}, top_cast=10)
        assert links == []

    def test_null_character_becomes_none(self):
        credits = {"cast": [{"id": 1, "name": "A", "character": "", "order": 0}], "crew": []}
        person_map = {1: 101}
        links = process_credits(credits, 1, "movie_id", person_map, top_cast=10)
        assert links[0]["character_name"] is None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
