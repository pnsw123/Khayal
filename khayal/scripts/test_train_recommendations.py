"""Unit tests for train_recommendations.py — all I/O mocked."""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import MagicMock, patch

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


def test_fetch_ratings_returns_data() -> None:
    from train_recommendations import fetch_ratings

    mock_result = MagicMock()
    mock_result.data = [
        {"user_id": "u1", "media_id": "m1", "rating": 8.0},
    ]
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.execute.return_value = mock_result

    mock_supabase = MagicMock()
    mock_supabase.create_client.return_value = mock_client

    with patch.dict("sys.modules", {"supabase": mock_supabase}):
        result = fetch_ratings("https://x.supabase.co", "key")

    assert result == [{"user_id": "u1", "media_id": "m1", "rating": 8.0}]


def test_fetch_ratings_empty_when_no_data() -> None:
    from train_recommendations import fetch_ratings

    mock_result = MagicMock()
    mock_result.data = None
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.execute.return_value = mock_result

    mock_supabase = MagicMock()
    mock_supabase.create_client.return_value = mock_client

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


def test_generate_and_store_calls_upsert() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    # Model that scores linearly: score = hash(uid+iid) % 10
    mock_model = MagicMock()
    mock_model.score.side_effect = lambda u, i: float(abs(hash(u + i)) % 10)

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1", "u2"],
            ["m1", "m2", "m3"],
            "https://x.supabase.co",
            "key",
            algo="cornac-bpr",
            top_n=2,
        )

    # 2 users × top_n=2 items = 4 rows total
    assert total == 4
    assert mock_client.table.return_value.upsert.call_count == 2


def test_generate_and_store_returns_zero_when_score_raises() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.side_effect = KeyError("unknown item")

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["m1"],
            "https://x.supabase.co",
            "key",
        )

    assert total == 0
    mock_client.table.return_value.upsert.assert_not_called()


def test_generate_and_store_respects_top_n() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.side_effect = lambda u, i: float(i[-1])  # score = last digit of iid

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            ["u1"],
            [f"m{j}" for j in range(10)],
            "https://x.supabase.co",
            "key",
            top_n=3,
        )

    assert total == 3
    rows_passed = mock_client.table.return_value.upsert.call_args[0][0]
    assert len(rows_passed) == 3


def test_generate_and_store_algo_name_in_rows() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_model = MagicMock()
    mock_model.score.return_value = 5.0

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        generate_and_store_recommendations(
            mock_model,
            ["u1"],
            ["m1"],
            "https://x.supabase.co",
            "key",
            algo="cornac-bpr",
        )

    rows = mock_client.table.return_value.upsert.call_args[0][0]
    assert rows[0]["algo"] == "cornac-bpr"
    assert rows[0]["user_id"] == "u1"
    assert rows[0]["movie_id"] == "m1"
    assert rows[0]["score"] == 5.0


def test_generate_and_store_empty_users_returns_zero() -> None:
    mock_supabase_mod, _ = _make_supabase_mock()

    mock_model = MagicMock()

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_model,
            [],
            ["m1", "m2"],
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
