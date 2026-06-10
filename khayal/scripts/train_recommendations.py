"""Recommendation model training script using cornac (BPR / MF)."""

from __future__ import annotations

import os
import sys
from typing import Any


def get_env(key: str) -> str:
    """Return required environment variable or raise."""
    value = os.environ.get(key, "")
    if not value:
        raise RuntimeError(f"Required env var {key!r} is not set")
    return value


def fetch_ratings(
    supabase_url: str,
    service_key: str,
) -> list[dict[str, Any]]:
    """Fetch user ratings from Supabase."""
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase is required: pip install supabase") from exc

    client = create_client(supabase_url, service_key)
    result = (
        client.table("user_ratings")
        .select("user_id, media_id, rating")
        .execute()
    )
    from typing import cast
    raw: list[Any] = list(result.data) if result.data else []
    rows: list[dict[str, Any]] = cast(list[dict[str, Any]], [r for r in raw if isinstance(r, dict)])
    return rows


def build_triplets(
    ratings: list[dict[str, Any]],
) -> tuple[list[str], list[str], list[float]]:
    """Convert rating rows into (user_ids, item_ids, ratings) triplets."""
    user_ids: list[str] = []
    item_ids: list[str] = []
    rating_vals: list[float] = []
    for row in ratings:
        uid = str(row.get("user_id", ""))
        iid = str(row.get("media_id", ""))
        rating = float(row.get("rating", 0.0))
        if uid and iid and rating > 0:
            user_ids.append(uid)
            item_ids.append(iid)
            rating_vals.append(rating)
    return user_ids, item_ids, rating_vals


def train_bpr_model(
    user_ids: list[str],
    item_ids: list[str],
    rating_vals: list[float],
    n_factors: int = 64,
    n_epochs: int = 20,
) -> Any:
    """Train a BPR model using cornac. Returns fitted model."""
    try:
        import cornac  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError("cornac is required: pip install cornac") from exc

    dataset = cornac.data.Dataset.from_uir(
        zip(user_ids, item_ids, rating_vals)
    )
    model = cornac.models.BPR(k=n_factors, max_iter=n_epochs, verbose=False)
    model.fit(dataset)
    return model


def save_model(model: Any, path: str) -> None:
    """Persist trained model to disk."""
    import pickle  # noqa: S403

    with open(path, "wb") as fh:
        pickle.dump(model, fh)


def generate_and_store_recommendations(
    model: Any,
    user_ids: list[str],
    item_ids: list[str],
    supabase_url: str,
    service_key: str,
    algo: str = "cornac-bpr",
    top_n: int = 50,
) -> int:
    """Generate top-N recommendations per user and upsert to Supabase.

    Returns the total number of rows upserted.
    """
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase is required: pip install supabase") from exc

    from datetime import datetime, timezone

    client = create_client(supabase_url, service_key)

    unique_users = list(dict.fromkeys(user_ids))
    unique_items = list(dict.fromkeys(item_ids))
    generated_at = datetime.now(timezone.utc).isoformat()

    total_upserted = 0
    for uid in unique_users:
        scored: list[tuple[float, str]] = []
        for iid in unique_items:
            try:
                score = float(model.score(uid, iid))
            except Exception:  # noqa: BLE001
                continue
            scored.append((score, iid))

        scored.sort(reverse=True)
        top = scored[:top_n]

        rows = [
            {
                "user_id": uid,
                "movie_id": iid,
                "score": score,
                "algo": algo,
                "generated_at": generated_at,
            }
            for score, iid in top
        ]

        if rows:
            client.table("recommendations").upsert(
                rows,
                on_conflict="user_id,movie_id,algo",
            ).execute()
            total_upserted += len(rows)

    print(f"[train] upserted {total_upserted} recommendation rows (algo={algo})")
    return total_upserted


def run_training() -> None:
    """Entry point — fetch ratings, train, save model, generate recommendations."""
    supabase_url = get_env("SUPABASE_URL")
    service_key = get_env("SUPABASE_SERVICE_ROLE_KEY")

    ratings = fetch_ratings(supabase_url, service_key)
    if not ratings:
        print("[train] no ratings found — skipping")
        return

    user_ids, item_ids, rating_vals = build_triplets(ratings)
    print(f"[train] loaded {len(rating_vals)} ratings from {len(set(user_ids))} users")

    model = train_bpr_model(user_ids, item_ids, rating_vals)
    model_path = os.environ.get("MODEL_PATH", "/tmp/bpr_model.pkl")
    save_model(model, model_path)
    print(f"[train] model saved to {model_path}")

    top_n = int(os.environ.get("RECS_TOP_N", "50"))
    generate_and_store_recommendations(
        model,
        user_ids,
        item_ids,
        supabase_url,
        service_key,
        algo="cornac-bpr",
        top_n=top_n,
    )


if __name__ == "__main__":
    try:
        run_training()
    except RuntimeError as exc:
        print(f"[train] error: {exc}", file=sys.stderr)
        sys.exit(1)
