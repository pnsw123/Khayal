#!/usr/bin/env python3
"""
TDD tests for train_recommendations.py

Run: pytest scripts/test_train_recommendations.py -v
"""

from __future__ import annotations

import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

# ---------------------------------------------------------------------------
# We import the module under test *after* patching heavy deps that require
# real credentials, so the module-level load_dotenv / supabase calls are safe.
# ---------------------------------------------------------------------------


def _make_module():
    """Import train_recommendations with env vars stubbed out."""
    import importlib
    import importlib.util

    scripts_dir = Path(__file__).parent
    spec = importlib.util.spec_from_file_location(
        "train_recommendations",
        scripts_dir / "train_recommendations.py",
    )
    assert spec and spec.loader
    m = importlib.util.module_from_spec(spec)

    with (
        patch.dict("os.environ", {
            "SUPABASE_URL": "https://test.supabase.co",
            "SUPABASE_SERVICE_KEY": "test-key",
        }),
        patch("supabase.create_client", return_value=MagicMock()),
    ):
        spec.loader.exec_module(m)  # type: ignore[union-attr]

    return m


@pytest.fixture(scope="module")
def mod():
    return _make_module()


# ---------------------------------------------------------------------------
# Test 1 — build_dataset returns a valid cornac Dataset
# ---------------------------------------------------------------------------

def test_build_dataset_returns_dataset(mod):
    df = pd.DataFrame({
        "user_id":  ["u1", "u1", "u2", "u2", "u3"],
        "movie_id": [1,    2,    1,    3,    2   ],
        "rating":   [4.0,  3.5,  5.0,  2.0,  4.5],
    })
    dataset = mod.build_dataset(df)
    # cornac Dataset exposes num_users and num_items
    assert dataset.num_users >= 2
    assert dataset.num_items >= 2


# ---------------------------------------------------------------------------
# Test 2 — get_top_n excludes already-seen movies
# ---------------------------------------------------------------------------

def test_get_top_n_excludes_seen(mod):
    scores = {10: 0.9, 20: 0.8, 30: 0.7, 40: 0.6}
    seen   = {10, 20}
    result = mod.get_top_n(scores, seen, n=4)
    ids = [r["movie_id"] for r in result]
    assert 10 not in ids
    assert 20 not in ids
    assert set(ids) == {30, 40}


# ---------------------------------------------------------------------------
# Test 3 — get_top_n returns exactly N results when enough candidates exist
# ---------------------------------------------------------------------------

def test_get_top_n_returns_n(mod):
    scores = {i: float(i) for i in range(20)}
    result = mod.get_top_n(scores, seen=set(), n=5)
    assert len(result) == 5


# ---------------------------------------------------------------------------
# Test 4 — cold_start_fallback returns popular movies for unknown users
# ---------------------------------------------------------------------------

def test_cold_start_fallback(mod):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.order.return_value.limit.return_value.execute.return_value.data = [
        {"movie_id": 99}, {"movie_id": 88}, {"movie_id": 77},
    ]
    results = mod.cold_start_fallback(mock_sb, user_id="new-user", n=3)
    assert len(results) == 3
    assert all("movie_id" in r for r in results)
    assert results[0]["movie_id"] == 99


# ---------------------------------------------------------------------------
# Test 5 — upsert_recommendations shapes payload correctly
# ---------------------------------------------------------------------------

def test_upsert_recommendations_payload(mod):
    mock_sb = MagicMock()
    upsert_mock = (
        mock_sb.table.return_value
               .upsert.return_value
               .execute
    )
    recs = [
        {"movie_id": 1, "score": 0.9},
        {"movie_id": 2, "score": 0.8},
    ]
    mod.upsert_recommendations(mock_sb, user_id="u1", recs=recs, algo="cornac-als")

    call_args = mock_sb.table.return_value.upsert.call_args
    rows = call_args[0][0]
    assert len(rows) == 2
    assert rows[0]["user_id"] == "u1"
    assert rows[0]["algo"] == "cornac-als"
    assert rows[0]["movie_id"] == 1
    assert "generated_at" in rows[0]
    assert "score" in rows[0]


# ---------------------------------------------------------------------------
# Test 6 — main() exits 0 with warning when fewer than 50 ratings
# ---------------------------------------------------------------------------

def test_main_exits_zero_on_sparse_data(mod):
    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.execute.return_value.data = [
        {"user_id": "u1", "movie_id": 1, "rating": 4.0},
        {"user_id": "u1", "movie_id": 2, "rating": 3.0},
        {"user_id": "u2", "movie_id": 1, "rating": 5.0},
    ]

    with (
        patch.object(mod, "_get_supabase_client", return_value=mock_sb),
    ):
        with pytest.raises(SystemExit) as exc_info:
            mod.main()
        assert exc_info.value.code == 0
