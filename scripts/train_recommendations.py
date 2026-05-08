#!/usr/bin/env python3
"""
KHAYAL nightly recommendation trainer.

Trains a cornac BPR model on the movie_ratings table and writes top-12
predictions per user to the recommendations table.

Usage:
  python scripts/train_recommendations.py

Requires env vars:
  SUPABASE_URL
  SUPABASE_SERVICE_KEY
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
from supabase import Client, create_client

ROOT = Path(__file__).parent.parent
load_dotenv(ROOT / ".env")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-7s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)
log = logging.getLogger("khayal-recs")

MIN_RATINGS = 50
TOP_N       = 12
ALGO_NAME   = "cornac-als"


# ─── Supabase client ──────────────────────────────────────────────────────────

def _get_supabase_client() -> Client:
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    return create_client(url, key)


# ─── Dataset builder ─────────────────────────────────────────────────────────

def build_dataset(df: pd.DataFrame):
    """Build a cornac Dataset from a ratings DataFrame (user_id, movie_id, rating)."""
    import cornac

    uir = list(zip(
        df["user_id"].astype(str),
        df["movie_id"].astype(str),
        df["rating"].astype(float),
    ))
    dataset = cornac.data.Dataset.from_uir(uir)
    return dataset


# ─── Top-N helper ────────────────────────────────────────────────────────────

def get_top_n(
    scores: dict[int, float],
    seen: set[int],
    n: int,
) -> list[dict[str, Any]]:
    """Return top-N (movie_id, score) dicts excluding already-seen movies."""
    unseen = [(mid, s) for mid, s in scores.items() if mid not in seen]
    unseen.sort(key=lambda x: x[1], reverse=True)
    return [{"movie_id": mid, "score": round(float(s), 6)} for mid, s in unseen[:n]]


# ─── Cold-start fallback ─────────────────────────────────────────────────────

def cold_start_fallback(
    sb: Client,
    user_id: str,
    n: int = TOP_N,
) -> list[dict[str, Any]]:
    """Return top-N popular movies for users with no rating history."""
    resp = (
        sb.table("movie_stats")
          .select("movie_id, avg_rating")
          .order("avg_rating", desc=True)
          .limit(n)
          .execute()
    )
    rows = resp.data or []
    return [{"movie_id": r["movie_id"], "score": float(r.get("avg_rating") or 0.0)} for r in rows]


# ─── Upsert writer ───────────────────────────────────────────────────────────

def upsert_recommendations(
    sb: Client,
    user_id: str,
    recs: list[dict[str, Any]],
    algo: str = ALGO_NAME,
) -> None:
    """Write recommendation rows to the recommendations table."""
    now = datetime.now(timezone.utc).isoformat()
    rows = [
        {
            "user_id":      user_id,
            "movie_id":     r["movie_id"],
            "algo":         algo,
            "score":        r["score"],
            "generated_at": now,
        }
        for r in recs
    ]
    sb.table("recommendations").upsert(
        rows,
        on_conflict="user_id,movie_id,algo",
    ).execute()


# ─── Main ─────────────────────────────────────────────────────────────────────

def main() -> None:
    import cornac

    sb = _get_supabase_client()

    log.info("Fetching ratings from Supabase …")
    resp = sb.table("movie_ratings").select("user_id, movie_id, rating").execute()
    rows = resp.data or []

    if len(rows) < MIN_RATINGS:
        log.warning(
            "Only %d ratings found (min %d required). Skipping training.",
            len(rows),
            MIN_RATINGS,
        )
        sys.exit(0)

    df = pd.DataFrame(rows)
    log.info("Loaded %d ratings from %d users.", len(df), df["user_id"].nunique())

    dataset = build_dataset(df)

    model = cornac.models.BPR(k=50, max_iter=30, learning_rate=0.01, lambda_reg=0.001, seed=42)
    model.fit(dataset)
    log.info("Model trained.")

    # Map internal cornac indices back to original IDs
    uid_map   = {v: k for k, v in dataset.uid_map.items()}   # int → user_id str
    iid_map   = {v: k for k, v in dataset.iid_map.items()}   # int → movie_id str

    # Seen items per user (internal cornac indices)
    seen_by_user: dict[int, set[int]] = {}
    for _, row in df.iterrows():
        u_idx = dataset.uid_map.get(str(row["user_id"]))
        i_idx = dataset.iid_map.get(str(row["movie_id"]))
        if u_idx is not None and i_idx is not None:
            seen_by_user.setdefault(u_idx, set()).add(i_idx)

    total_written = 0
    n_users       = dataset.num_users

    for u_idx in range(n_users):
        user_id_str = uid_map[u_idx]
        seen_idx    = seen_by_user.get(u_idx, set())

        # Score all items for this user
        all_scores: dict[int, float] = {}
        for i_idx in range(dataset.num_items):
            if i_idx not in seen_idx:
                score = float(model.score(u_idx, i_idx))
                movie_id_raw = iid_map[i_idx]
                try:
                    all_scores[int(movie_id_raw)] = score
                except (ValueError, TypeError):
                    all_scores[movie_id_raw] = score  # type: ignore[assignment]

        recs = get_top_n(all_scores, seen=set(), n=TOP_N)
        upsert_recommendations(sb, user_id=user_id_str, recs=recs)
        total_written += len(recs)

    log.info("Done. Users processed: %d. Total recs written: %d.", n_users, total_written)


if __name__ == "__main__":
    main()
