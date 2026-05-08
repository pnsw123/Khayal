#!/usr/bin/env python3
"""
KHAYAL SVD recommendation trainer — scikit-surprise collaborative filtering.

Trains an SVD model on movie_ratings and writes top-12 predictions per user
to the recommendations table. Safe to run nightly via GitHub Actions.
"""

from __future__ import annotations

import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from surprise import Dataset, Reader, SVD
from surprise.model_selection import cross_validate

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("khayal-svd")

MIN_RATINGS = 10
RATING_SCALE = (1, 10)
SVD_PARAMS = dict(n_factors=100, n_epochs=20, lr_all=0.005, reg_all=0.02)
TOP_N = 12


def init_supabase():
    from supabase import create_client
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


def fetch_ratings(sb) -> pd.DataFrame:
    response = sb.table("movie_ratings").select("user_id,movie_id,rating").execute()
    rows = response.data or []
    return pd.DataFrame(rows, columns=["user_id", "movie_id", "rating"])


def build_dataset(ratings_df: pd.DataFrame) -> Dataset:
    reader = Reader(rating_scale=RATING_SCALE)
    return Dataset.load_from_df(ratings_df[["user_id", "movie_id", "rating"]], reader)


def train_model(dataset: Dataset) -> SVD:
    algo = SVD(**SVD_PARAMS)
    cv_results = cross_validate(algo, dataset, measures=["RMSE"], cv=3, verbose=False)
    mean_rmse = cv_results["test_rmse"].mean()
    log.info("3-fold CV RMSE: %.4f", mean_rmse)
    trainset = dataset.build_full_trainset()
    algo.fit(trainset)
    return algo


def get_top_n(
    algo: SVD,
    trainset,
    ratings_df: pd.DataFrame,
    n: int = TOP_N,
) -> dict[str, list[tuple[str, float]]]:
    all_movie_ids = ratings_df["movie_id"].unique().tolist()
    user_ids = ratings_df["user_id"].unique().tolist()

    top_n: dict[str, list[tuple[str, float]]] = {}
    for uid in user_ids:
        rated = set(ratings_df[ratings_df["user_id"] == uid]["movie_id"].tolist())
        unseen = [mid for mid in all_movie_ids if mid not in rated]
        preds = [(mid, algo.predict(uid, mid).est) for mid in unseen]
        preds.sort(key=lambda x: x[1], reverse=True)
        top_n[uid] = preds[:n]
    return top_n


def build_upsert_payload(
    user_id: str,
    movie_id: str,
    score: float,
) -> dict[str, Any]:
    return {
        "user_id": user_id,
        "movie_id": movie_id,
        "algo": "surprise-svd",
        "score": round(float(score), 4),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def upsert_recommendations(sb, top_n: dict[str, list[tuple[str, float]]]) -> int:
    rows: list[dict[str, Any]] = []
    for uid, preds in top_n.items():
        for mid, score in preds:
            rows.append(build_upsert_payload(uid, mid, score))

    if not rows:
        log.info("No recommendations to upsert.")
        return 0

    (
        sb.table("recommendations")
        .upsert(rows, on_conflict="user_id,movie_id")
        .execute()
    )
    log.info("Upserted %d recommendation rows.", len(rows))
    return len(rows)


def main() -> None:
    log.info("Starting SVD recommendation training")

    sb = init_supabase()
    ratings_df = fetch_ratings(sb)
    log.info("Fetched %d ratings from movie_ratings", len(ratings_df))

    if len(ratings_df) < MIN_RATINGS:
        log.warning(
            "Only %d ratings found (minimum %d). Skipping training.",
            len(ratings_df),
            MIN_RATINGS,
        )
        sys.exit(0)

    dataset = build_dataset(ratings_df)
    algo = train_model(dataset)

    trainset = dataset.build_full_trainset()
    top_n = get_top_n(algo, trainset, ratings_df)

    upsert_recommendations(sb, top_n)
    log.info("SVD training complete.")


if __name__ == "__main__":
    main()
