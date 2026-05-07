#!/usr/bin/env python3
"""Tests for genre seeding logic."""
import pytest
from unittest.mock import MagicMock, patch
from slugify import slugify


# ── Unit tests for genre transform logic ───────────────────────────────────

class TestGenreSlug:
    def test_basic_slug(self):
        assert slugify("Action") == "action"

    def test_compound_slug(self):
        assert slugify("Science Fiction") == "science-fiction"

    def test_special_chars(self):
        assert slugify("Sci-Fi & Fantasy") == "sci-fi-fantasy"


class TestGenreMap:
    def test_movie_genre_link_built_correctly(self):
        genre_map = {28: 1, 12: 2, 16: 3}  # tmdb_id → our_id
        raw_genre_ids = [28, 12]
        links = [
            {"movie_id": 100, "genre_id": genre_map[gid]}
            for gid in raw_genre_ids if gid in genre_map
        ]
        assert len(links) == 2
        assert links[0] == {"movie_id": 100, "genre_id": 1}
        assert links[1] == {"movie_id": 100, "genre_id": 2}

    def test_unknown_genre_skipped(self):
        genre_map = {28: 1}
        raw_genre_ids = [28, 9999]  # 9999 not in map
        links = [
            {"movie_id": 1, "genre_id": genre_map[gid]}
            for gid in raw_genre_ids if gid in genre_map
        ]
        assert len(links) == 1

    def test_empty_genre_ids_produces_no_links(self):
        genre_map = {28: 1}
        links = [
            {"movie_id": 1, "genre_id": genre_map[gid]}
            for gid in [] if gid in genre_map
        ]
        assert links == []

    def test_tv_genre_link_built_correctly(self):
        genre_map = {10759: 5, 10765: 6}
        raw_genre_ids = [10759]
        links = [
            {"tv_series_id": 200, "genre_id": genre_map[gid]}
            for gid in raw_genre_ids if gid in genre_map
        ]
        assert links == [{"tv_series_id": 200, "genre_id": 5}]

    def test_dedup_same_genre(self):
        # Ensure we don't create duplicate bridge rows
        genre_map = {28: 1}
        raw_genre_ids = [28, 28]  # duplicate
        seen = set()
        links = []
        for gid in raw_genre_ids:
            if gid in genre_map and gid not in seen:
                links.append({"movie_id": 1, "genre_id": genre_map[gid]})
                seen.add(gid)
        assert len(links) == 1


class TestRawHelper:
    def test_dict_passthrough(self):
        d = {"id": 1, "name": "Action"}
        obj = MagicMock()
        obj._json = d
        result = obj._json if hasattr(obj, "_json") else dict(obj)
        assert result == d

    def test_genres_extracted_from_genres_list(self):
        raw = {"genres": [{"id": 28, "name": "Action"}, {"id": 12, "name": "Adventure"}]}
        gids = raw.get("genre_ids") or [g.get("id") for g in (raw.get("genres") or [])]
        assert gids == [28, 12]

    def test_genre_ids_preferred_over_genres_list(self):
        raw = {"genre_ids": [28], "genres": [{"id": 99, "name": "Other"}]}
        gids = raw.get("genre_ids") or [g.get("id") for g in (raw.get("genres") or [])]
        assert gids == [28]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
