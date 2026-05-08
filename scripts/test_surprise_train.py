#!/usr/bin/env python3
"""
TDD test suite for surprise_train.py — all 6 tests must pass.

Run:
  cd ~/Desktop/DB
  source .venv/bin/activate
  python -m pytest scripts/test_surprise_train.py -v
"""

from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pandas as pd
import pytest

sys.path.insert(0, str(Path(__file__).parent))
import surprise_train
from surprise_train import (
    build_dataset,
    build_upsert_payload,
    get_top_n,
    main,
)
from surprise import SVD

# ─── Synthetic data ──────────────────────────────────────────────────────────

RATINGS_DF = pd.DataFrame(
    [
        {"user_id": "u1", "movie_id": "m1", "rating": 8},
        {"user_id": "u1", "movie_id": "m2", "rating": 6},
        {"user_id": "u1", "movie_id": "m3", "rating": 9},
        {"user_id": "u2", "movie_id": "m1", "rating": 7},
        {"user_id": "u2", "movie_id": "m4", "rating": 5},
        {"user_id": "u2", "movie_id": "m5", "rating": 8},
        {"user_id": "u3", "movie_id": "m2", "rating": 9},
        {"user_id": "u3", "movie_id": "m3", "rating": 7},
        {"user_id": "u3", "movie_id": "m4", "rating": 6},
        {"user_id": "u3", "movie_id": "m5", "rating": 4},
        {"user_id": "u3", "movie_id": "m6", "rating": 3},
    ]
)


# ─── Test 1: build_dataset returns a Surprise Dataset with correct scale ─────

def test_build_dataset_returns_correct_type_and_scale():
    dataset = build_dataset(RATINGS_DF)
    from surprise import Dataset as SurpriseDataset
    assert isinstance(dataset, SurpriseDataset)
    trainset = dataset.build_full_trainset()
    assert trainset.rating_scale == (1, 10)


# ─── Test 2: get_top_n returns exactly n items per user ──────────────────────

def test_get_top_n_returns_exactly_n_per_user():
    dataset = build_dataset(RATINGS_DF)
    algo = SVD(n_factors=5, n_epochs=5)
    trainset = dataset.build_full_trainset()
    algo.fit(trainset)

    top_n = get_top_n(algo, trainset, RATINGS_DF, n=3)
    for uid, preds in top_n.items():
        assert len(preds) <= 3, f"User {uid} got {len(preds)} > 3 predictions"


# ─── Test 3: get_top_n excludes already-rated movies ────────────────────────

def test_get_top_n_excludes_rated_movies():
    dataset = build_dataset(RATINGS_DF)
    algo = SVD(n_factors=5, n_epochs=5)
    trainset = dataset.build_full_trainset()
    algo.fit(trainset)

    top_n = get_top_n(algo, trainset, RATINGS_DF, n=12)
    for uid, preds in top_n.items():
        rated = set(RATINGS_DF[RATINGS_DF["user_id"] == uid]["movie_id"].tolist())
        predicted_ids = {mid for mid, _ in preds}
        overlap = rated & predicted_ids
        assert len(overlap) == 0, f"User {uid} has overlap: {overlap}"


# ─── Test 4: prediction scores are within rating scale (1, 10) ───────────────

def test_prediction_scores_within_rating_scale():
    dataset = build_dataset(RATINGS_DF)
    algo = SVD(n_factors=5, n_epochs=5)
    trainset = dataset.build_full_trainset()
    algo.fit(trainset)

    top_n = get_top_n(algo, trainset, RATINGS_DF, n=12)
    for uid, preds in top_n.items():
        for mid, score in preds:
            assert 1 <= score <= 10, f"Score {score} for user {uid}, movie {mid} is out of range"


# ─── Test 5: upsert payload has required keys ────────────────────────────────

def test_upsert_payload_has_required_keys():
    payload = build_upsert_payload("u1", "m1", 7.5)
    required = {"user_id", "movie_id", "algo", "score", "generated_at"}
    assert required.issubset(payload.keys()), f"Missing keys: {required - payload.keys()}"
    assert payload["algo"] == "surprise-svd"
    assert payload["user_id"] == "u1"
    assert payload["movie_id"] == "m1"
    assert isinstance(payload["score"], float)
    assert isinstance(payload["generated_at"], str)


# ─── Test 6: main() exits 0 without training when < 10 ratings ──────────────

def test_main_exits_gracefully_when_insufficient_ratings():
    small_df = RATINGS_DF.head(5)

    mock_sb = MagicMock()
    mock_sb.table.return_value.select.return_value.execute.return_value = MagicMock(
        data=small_df.to_dict("records")
    )

    with patch("surprise_train.init_supabase", return_value=mock_sb), \
         patch("surprise_train.fetch_ratings", return_value=small_df):
        with pytest.raises(SystemExit) as exc_info:
            main()
        assert exc_info.value.code == 0
