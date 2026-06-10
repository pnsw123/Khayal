"""Unit tests for surprise_train.py — all I/O mocked, no network required."""

from __future__ import annotations

import os
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from surprise_train import (
    clamp_rating,
    generate_and_store_recommendations,
    get_env,
)


# ---------------------------------------------------------------------------
# get_env
# ---------------------------------------------------------------------------


def test_get_env_returns_value() -> None:
    with patch.dict(os.environ, {"SUPABASE_URL": "https://test.supabase.co"}):
        assert get_env("SUPABASE_URL") == "https://test.supabase.co"


def test_get_env_raises_for_missing() -> None:
    env_copy = {k: v for k, v in os.environ.items() if k != "SVD_MISSING"}
    with patch.dict(os.environ, env_copy, clear=True):
        with pytest.raises(RuntimeError, match="SVD_MISSING"):
            get_env("SVD_MISSING")


def test_get_env_raises_for_empty() -> None:
    with patch.dict(os.environ, {"SVD_EMPTY": ""}):
        with pytest.raises(RuntimeError, match="SVD_EMPTY"):
            get_env("SVD_EMPTY")


# ---------------------------------------------------------------------------
# clamp_rating
# ---------------------------------------------------------------------------


def test_clamp_rating_within_range() -> None:
    assert clamp_rating(5.0) == 5.0


def test_clamp_rating_below_min() -> None:
    assert clamp_rating(0.0) == 1.0


def test_clamp_rating_above_max() -> None:
    assert clamp_rating(11.0) == 10.0


def test_clamp_rating_exactly_min() -> None:
    assert clamp_rating(1.0) == 1.0


def test_clamp_rating_exactly_max() -> None:
    assert clamp_rating(10.0) == 10.0


def test_clamp_rating_custom_range() -> None:
    assert clamp_rating(0.5, min_val=0.0, max_val=5.0) == 0.5
    assert clamp_rating(-1.0, min_val=0.0, max_val=5.0) == 0.0
    assert clamp_rating(6.0, min_val=0.0, max_val=5.0) == 5.0


def test_clamp_rating_float_precision() -> None:
    result = clamp_rating(7.777)
    assert abs(result - 7.777) < 1e-9


# ---------------------------------------------------------------------------
# fetch_ratings — mocked
# ---------------------------------------------------------------------------


def test_fetch_ratings_returns_list() -> None:
    from surprise_train import fetch_ratings

    mock_result = MagicMock()
    mock_result.data = [{"user_id": "u1", "media_id": "m1", "rating": 9.0}]
    mock_client = MagicMock()
    mock_client.table.return_value.select.return_value.execute.return_value = mock_result

    mock_supabase = MagicMock()
    mock_supabase.create_client.return_value = mock_client

    with patch.dict("sys.modules", {"supabase": mock_supabase}):
        result = fetch_ratings("https://x.supabase.co", "key")

    assert result == [{"user_id": "u1", "media_id": "m1", "rating": 9.0}]


def test_fetch_ratings_none_data_returns_empty() -> None:
    from surprise_train import fetch_ratings

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
# build_surprise_dataset — mocked
# ---------------------------------------------------------------------------


def test_build_surprise_dataset_filters_zero_ratings() -> None:
    from surprise_train import build_surprise_dataset

    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": "m1", "rating": 0.0},
        {"user_id": "u2", "media_id": "m2", "rating": 8.0},
    ]

    mock_reader = MagicMock()
    mock_dataset = MagicMock()
    mock_dataset_class = MagicMock()
    mock_dataset_class.load_from_df.return_value = mock_dataset
    mock_reader_class = MagicMock(return_value=mock_reader)

    mock_pd = MagicMock()
    mock_df = MagicMock()
    mock_pd.DataFrame.return_value = mock_df
    mock_df.__getitem__.return_value = mock_df

    mock_surprise = MagicMock()
    mock_surprise.Dataset = mock_dataset_class
    mock_surprise.Reader = mock_reader_class

    with patch.dict("sys.modules", {"surprise": mock_surprise, "pandas": mock_pd}):
        build_surprise_dataset(ratings)

    call_args = mock_pd.DataFrame.call_args
    rows_passed = call_args[0][0]
    # only the non-zero rating row should be included
    assert len(rows_passed) == 1
    assert rows_passed[0][2] == 8.0


def test_build_surprise_dataset_clamps_ratings() -> None:
    from surprise_train import build_surprise_dataset

    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": "m1", "rating": 15.0},
    ]

    mock_reader = MagicMock()
    mock_dataset = MagicMock()
    mock_dataset_class = MagicMock()
    mock_dataset_class.load_from_df.return_value = mock_dataset
    mock_reader_class = MagicMock(return_value=mock_reader)

    mock_pd = MagicMock()
    mock_df = MagicMock()
    mock_pd.DataFrame.return_value = mock_df
    mock_df.__getitem__.return_value = mock_df

    mock_surprise = MagicMock()
    mock_surprise.Dataset = mock_dataset_class
    mock_surprise.Reader = mock_reader_class

    with patch.dict("sys.modules", {"surprise": mock_surprise, "pandas": mock_pd}):
        build_surprise_dataset(ratings)

    rows_passed = mock_pd.DataFrame.call_args[0][0]
    assert rows_passed[0][2] == 10.0  # clamped from 15.0


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


def _make_pred(est: float) -> Any:
    pred = MagicMock()
    pred.est = est
    return pred


_SAMPLE_RATINGS: list[dict[str, Any]] = [
    {"user_id": "u1", "media_id": "m1", "rating": 8.0},
    {"user_id": "u1", "media_id": "m2", "rating": 6.0},
    {"user_id": "u2", "media_id": "m1", "rating": 7.0},
]


def test_svd_generate_and_store_calls_upsert() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_algo = MagicMock()
    mock_algo.predict.side_effect = lambda u, i: _make_pred(float(abs(hash(u + i)) % 10))

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_algo,
            _SAMPLE_RATINGS,
            "https://x.supabase.co",
            "key",
            algo_name="surprise-svd",
            top_n=2,
        )

    # 2 unique users × top_n=2 = 4 rows
    assert total == 4
    assert mock_client.table.return_value.upsert.call_count == 2


def test_svd_generate_and_store_skips_predict_errors() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_algo = MagicMock()
    mock_algo.predict.side_effect = ValueError("cold start")

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_algo,
            _SAMPLE_RATINGS,
            "https://x.supabase.co",
            "key",
        )

    assert total == 0
    mock_client.table.return_value.upsert.assert_not_called()


def test_svd_generate_and_store_respects_top_n() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": f"m{j}", "rating": float(j + 1)}
        for j in range(10)
    ]
    mock_algo = MagicMock()
    mock_algo.predict.side_effect = lambda u, i: _make_pred(float(i[1:]))

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_algo,
            ratings,
            "https://x.supabase.co",
            "key",
            top_n=4,
        )

    assert total == 4
    rows = mock_client.table.return_value.upsert.call_args[0][0]
    assert len(rows) == 4


def test_svd_generate_and_store_algo_name_in_rows() -> None:
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_algo = MagicMock()
    mock_algo.predict.return_value = _make_pred(7.5)

    ratings: list[dict[str, Any]] = [
        {"user_id": "u1", "media_id": "m1", "rating": 8.0},
    ]

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        generate_and_store_recommendations(
            mock_algo,
            ratings,
            "https://x.supabase.co",
            "key",
            algo_name="surprise-svd",
        )

    rows = mock_client.table.return_value.upsert.call_args[0][0]
    assert rows[0]["algo"] == "surprise-svd"
    assert rows[0]["user_id"] == "u1"
    assert rows[0]["movie_id"] == "m1"
    assert rows[0]["score"] == 7.5


def test_svd_generate_and_store_filters_zero_ratings() -> None:
    """Rows with rating <= 0 must not contribute users or items."""
    mock_supabase_mod, mock_client = _make_supabase_mock()

    mock_algo = MagicMock()
    mock_algo.predict.return_value = _make_pred(5.0)

    ratings: list[dict[str, Any]] = [
        {"user_id": "u_zero", "media_id": "m_zero", "rating": 0.0},
    ]

    with patch.dict("sys.modules", {"supabase": mock_supabase_mod}):
        total = generate_and_store_recommendations(
            mock_algo,
            ratings,
            "https://x.supabase.co",
            "key",
        )

    assert total == 0
    mock_client.table.return_value.upsert.assert_not_called()


# ---------------------------------------------------------------------------
# save_model
# ---------------------------------------------------------------------------


def test_save_model_roundtrip(tmp_path: Any) -> None:
    from surprise_train import save_model

    path = str(tmp_path / "svd.pkl")
    payload = {"svd": True, "n_factors": 100}
    save_model(payload, path)

    import pickle  # noqa: S403

    with open(path, "rb") as fh:
        loaded = pickle.load(fh)  # noqa: S301

    assert loaded == payload
