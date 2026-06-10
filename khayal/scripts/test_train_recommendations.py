"""Unit tests for train_recommendations.py — all I/O mocked."""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import MagicMock, call, patch

import pytest

from train_recommendations import (
    build_triplets,
    generate_and_store_recommendations,
    get_env,
)

# ---------------------------------------------------------------------------
# get_env
# ---------------------------------------------------------------------------


def test_get_env_present() -> None:
    with patch.dict(os.environ, {"SUPABASE_URL": "https://example.supabase.co"}):
        assert get_env("SUPABASE_URL") == "https://example.supabase.co"


def test_get_env_absent_raises() -> None:
    env_copy = {k: v for k, v in os.environ.items() if k != "NOT_SET_XYZ"}
    with patch.dict(os.environ, env_copy, clear=True):
        with pytest.raises(RuntimeError, match="NOT_SET_XYZ"):
            get_env("NOT_SET_XYZ")


# ---------------------------------------------------------------------------
# build_triplets
# ---------------------------------------------------------------------------


def test_build_triplets_basic() -> None:
    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": "m1", "rating": 8.0},
        {"user_id": "u2", "media_id": "m2", "rating": 5.0},
    ]
    user_ids, item_ids, rating_vals = build_triplets(ratings)
    assert user_ids == ["u1", "u2"]
    assert item_ids == ["m1", "m2"]
    assert rating_vals == [8.0, 5.0]


def test_build_triplets_skips_zero_rating() -> None:
    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": "m1", "rating": 0.0},
        {"user_id": "u2", "media_id": "m2", "rating": 7.0},
    ]
    _, _, rating_vals = build_triplets(ratings)
    assert len(rating_vals) == 1
    assert rating_vals[0] == 7.0


def test_build_triplets_skips_missing_user_id() -> None:
    ratings: list[dict[str, Any]] = [
        {"user_id": "", "media_id": "m1", "rating": 5.0},
        {"user_id": "u1", "media_id": "m2", "rating": 5.0},
    ]
    user_ids, _, _ = build_triplets(ratings)
    assert user_ids == ["u1"]


def test_build_triplets_skips_missing_item_id() -> None:
    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": "", "rating": 5.0},
        {"user_id": "u2", "media_id": "m2", "rating": 5.0},
    ]
    _, item_ids, _ = build_triplets(ratings)
    assert item_ids == ["m2"]


def test_build_triplets_empty_returns_empty() -> None:
    u, i, r = build_triplets([])
    assert u == []
    assert i == []
    assert r == []


def test_build_triplets_coerces_types() -> None:
    ratings: list[dict[str, Any]] = [
        {"user_id": 1, "media_id": 2, "rating": "9"},
    ]
    user_ids, item_ids, rating_vals = build_triplets(ratings)
    assert user_ids == ["1"]
    assert item_ids == ["2"]
    assert rating_vals == [9.0]


def test_build_triplets_large_set() -> None:
    ratings: list[dict[str, Any]] = [
        {"user_id": f"u{i}", "media_id": f"m{i}", "rating": float(i % 10 + 1)}
        for i in range(1000)
    ]
    user_ids, item_ids, rating_vals = build_triplets(ratings)
    assert len(user_ids) == 1000
    assert len(set(user_ids)) == 1000


# ---------------------------------------------------------------------------
# fetch_ratings — mocked
# ---------------------------------------------------------------------------


def _make_table_mock(movie_data: list[Any], tv_data: list[Any]) -> tuple[Any, Any]:
    """Return (mock_supabase_module, mock_client) with per-table results."""
    mock_client = MagicMock()

    def table_side_effect(name: str) -> Any:
        tbl = MagicMock()
        if name == "movie_ratings":
            result = MagicMock()
            result.data = movie_data
            tbl.select.return_value.execute.return_value = result
        elif name == "tv_series_ratings":
            result = MagicMock()
            result.data = tv_data
            tbl.select.return_value.execute.return_value = result
        else:
            result = MagicMock()
            result.data = []
            tbl.select.return_value.execute.return_value = result
        return tbl

    mock_client.table.side_effect = table_side_effect
    mock_supabase = MagicMock()
    mock_supabase.create_client.return_value = mock_client
    return mock_supabase, mock_client


def test_fetch_ratings_returns_movie_rows() -> None:
    from train_recommendations import fetch_ratings

    mock_supabase, _ = _make_table_mock(
        movie_data=[{"user_id": "u1", "movie_id": 10, "rating": 8.0}],
        tv_data=[],
    )

    with patch.dict("sys.modules", {"supabase": mock_supabase}):
        result = fetch_ratings("https://x.supabase.co", "key")

    assert len(result) == 1
    assert result[0]["media_id"] == "10"
    assert result[0]["media_type"] == "movie"
    assert result[0]["rating"] == 8.0


def test_fetch_ratings_returns_tv_rows() -> None:
    from train_recommendations import fetch_ratings

    mock_supabase, _ = _make_table_mock(
        movie_data=[],
        tv_data=[{"user_id": "u1", "tv_series_id": 99, "rating": 7.0}],
    )

    with patch.dict("sys.modules", {"supabase": mock_supabase}):
        result = fetch_ratings("https://x.supabase.co", "key")

    assert len(result) == 1
    assert result[0]["media_id"] == "99"
    assert result[0]["media_type"] == "tv"


def test_fetch_ratings_merges_both_tables() -> None:
    from train_recommendations import fetch_ratings

    mock_supabase, _ = _make_table_mock(
        movie_data=[{"user_id": "u1", "movie_id": 1, "rating": 8.0}],
        tv_data=[{"user_id": "u2", "tv_series_id": 2, "rating": 6.0}],
    )

    with patch.dict("sys.modules", {"supabase": mock_supabase}):
        result = fetch_ratings("https://x.supabase.co", "key")

    assert len(result) == 2
    types = {r["media_type"] for r in result}
    assert types == {"movie", "tv"}


def test_fetch_ratings_empty_when_no_data() -> None:
    from train_recommendations import fetch_ratings

    mock_supabase, _ = _make_table_mock(movie_data=[], tv_data=[])

    with patch.dict("sys.modules", {"supabase": mock_supabase}):
        result = fetch_ratings("https://x.supabase.co", "key")

    assert result == []


# ---------------------------------------------------------------------------
# save_model — mocked
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# generate_and_store_recommendations — mocked
# ---------------------------------------------------------------------------


def _make_supabase_mock() -> tuple[Any, Any]:
    """Return (mock_supabase_module, mock_client)."""
    mock_client = MagicMock()
    (
        mock_client.table.return_value
        .upsert.return_value
        .execute.return_value
    ) = MagicMock()

    mock_supabase_mod = MagicMock()
    mock_supabase_mod.create_client.return_value = mock_client
    return mock_supabase_mod, mock_client


def test_generate_and_store_calls_upsert_movies_only() -> None:
    """All items are movies → single upsert per user using movie conflict key."""
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.side_effect = lambda u, i: float(abs(hash(u + i)) % 10)

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1", "u2"],
            ["1", "2", "3"],
            "https://x.supabase.co",
            "key",
            algo="cornac-bpr",
            top_n=2,
            item_media_types={"1": "movie", "2": "movie", "3": "movie"},
        )

    # 2 users × top_n=2 = 4 rows, all movie upserts
    assert total == 4
    # 2 upsert calls (one per user, movies only)
    assert mock_client.table.return_value.upsert.call_count == 2
    # conflict key must be movie variant
    for c in mock_client.table.return_value.upsert.call_args_list:
        assert c[1]["on_conflict"] == "user_id,movie_id,source"


def test_generate_and_store_tv_items_use_tv_series_id() -> None:
    """TV items → tv_series_id set, movie_id=None, TV conflict key."""
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.return_value = 8.0

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["42"],
            "https://x.supabase.co",
            "key",
            algo="cornac-bpr",
            item_media_types={"42": "tv"},
        )

    assert total == 1
    upsert_call = mock_client.table.return_value.upsert.call_args
    rows = upsert_call[0][0]
    assert rows[0]["tv_series_id"] == 42
    assert rows[0]["movie_id"] is None
    assert upsert_call[1]["on_conflict"] == "user_id,tv_series_id,source"


def test_generate_and_store_mixed_media_types() -> None:
    """Mixed movie + TV items → two separate upsert calls with correct keys."""
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.return_value = 5.0

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["10", "20"],
            "https://x.supabase.co",
            "key",
            algo="cornac-bpr",
            item_media_types={"10": "movie", "20": "tv"},
        )

    assert total == 2
    # Two upserts: one movie, one TV
    assert mock_client.table.return_value.upsert.call_count == 2
    conflict_keys = {
        c[1]["on_conflict"]
        for c in mock_client.table.return_value.upsert.call_args_list
    }
    assert conflict_keys == {"user_id,movie_id,source", "user_id,tv_series_id,source"}


def test_generate_and_store_movie_row_fields() -> None:
    """Movie row has movie_id=int, tv_series_id=None, correct source."""
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.return_value = 5.0

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["7"],
            "https://x.supabase.co",
            "key",
            algo="cornac-bpr",
            item_media_types={"7": "movie"},
        )

    rows = mock_client.table.return_value.upsert.call_args[0][0]
    assert rows[0]["source"] == "cornac-bpr"
    assert rows[0]["user_id"] == "u1"
    assert rows[0]["movie_id"] == 7
    assert rows[0]["tv_series_id"] is None
    assert rows[0]["score"] == 5.0


def test_generate_and_store_returns_zero_when_score_raises() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.side_effect = KeyError("unknown item")

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["1"],
            "https://x.supabase.co",
            "key",
        )

    assert total == 0
    mock_client.table.return_value.upsert.assert_not_called()


def test_generate_and_store_respects_top_n() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.side_effect = lambda u, i: float(i)  # score = numeric iid

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1"],
            [str(j) for j in range(10)],
            "https://x.supabase.co",
            "key",
            top_n=3,
            item_media_types={str(j): "movie" for j in range(10)},
        )

    assert total == 3
    rows_passed = mock_client.table.return_value.upsert.call_args[0][0]
    assert len(rows_passed) == 3


def test_generate_and_store_defaults_unknown_item_to_movie() -> None:
    """Items with no media_type entry default to movie."""
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.return_value = 4.0

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["5"],
            "https://x.supabase.co",
            "key",
            item_media_types={},  # no entry for "5"
        )

    upsert_call = mock_client.table.return_value.upsert.call_args
    assert upsert_call[1]["on_conflict"] == "user_id,movie_id,source"
    rows = upsert_call[0][0]
    assert rows[0]["movie_id"] == 5
    assert rows[0]["tv_series_id"] is None


def test_generate_and_store_empty_users_returns_zero() -> None:
    mock_supabase_mod, _ = _make_supabase_mock()

    mock_model = MagicMock()

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            [],
            ["1", "2"],
            "https://x.supabase.co",
            "key",
        )

    assert total == 0


# ---------------------------------------------------------------------------
# save_model — mocked
# ---------------------------------------------------------------------------


def test_save_model_writes_file(tmp_path: Any) -> None:
    from train_recommendations import save_model

    path = str(tmp_path / "model.pkl")
    fake_model = {"weights": [1, 2, 3]}
    save_model(fake_model, path)

    import pickle  # noqa: S403

    with open(path, "rb") as fh:
        loaded = pickle.load(fh)  # noqa: S301

    assert loaded == fake_model
