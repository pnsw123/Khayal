"""SVD recommendation training script using scikit-surprise."""

from __future__ import annotations

import os
import sys
from datetime import UTC
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


def clamp_rating(value: float, min_val: float = 1.0, max_val: float = 10.0) -> float:
    """Clamp a rating to [min_val, max_val]."""
    return max(min_val, min(max_val, value))


def build_surprise_dataset(
    ratings: list[dict[str, Any]],
    rating_scale: tuple[float, float] = (1.0, 10.0),
) -> Any:
    """Convert rating dicts into a surprise Dataset."""
    try:
        import pandas as pd  # noqa: PLC0415
        from surprise import Dataset, Reader  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError(
            "scikit-surprise and pandas are required: pip install scikit-surprise pandas"
        ) from exc

    rows = []
    for row in ratings:
        uid = str(row.get("user_id", ""))
        iid = str(row.get("media_id", ""))
        raw_rating = float(row.get("rating", 0.0))
        # Filter zero/negative ratings before clamping
        if not uid or not iid or raw_rating <= 0:
            continue
        rating = clamp_rating(raw_rating)
        rows.append((uid, iid, rating))

    df = pd.DataFrame(rows, columns=["user_id", "item_id", "rating"])
    reader = Reader(rating_scale=rating_scale)
    return Dataset.load_from_df(df[["user_id", "item_id", "rating"]], reader)


def train_svd(
    dataset: Any,
    n_factors: int = 100,
    n_epochs: int = 20,
    lr_all: float = 0.005,
    reg_all: float = 0.02,
) -> Any:
    """Train SVD model on the provided dataset. Returns fitted algorithm."""
    try:
        from surprise import SVD  # noqa: PLC0415
        from surprise.model_selection import train_test_split  # noqa: PLC0415
    except ImportError as exc:
        raise RuntimeError("scikit-surprise is required: pip install scikit-surprise") from exc

    trainset, _ = train_test_split(dataset, test_size=0.1, random_state=42)
    algo = SVD(n_factors=n_factors, n_epochs=n_epochs, lr_all=lr_all, reg_all=reg_all)
    algo.fit(trainset)
    return algo


def save_model(model: Any, path: str) -> None:
    """Persist trained SVD model to disk."""
    import pickle  # noqa: S403

    with open(path, "wb") as fh:
        pickle.dump(model, fh)


def generate_and_store_recommendations(
    algo: Any,
    ratings: list[dict[str, Any]],
    supabase_url: str,
    service_key: str,
    algo_name: str = "surprise-svd",
    top_n: int = 50,
) -> int:
    """Generate top-N recommendations per user and upsert to Supabase.

    Returns the total number of rows upserted.
    """
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase is required: pip install supabase") from exc

    from datetime import datetime

    client = create_client(supabase_url, service_key)

    # Build unique user/item sets from raw rating rows
    unique_users: list[str] = list(
        dict.fromkeys(
            str(r.get("user_id", ""))
            for r in ratings
            if r.get("user_id") and float(r.get("rating", 0)) > 0
        )
    )
    unique_items: list[str] = list(
        dict.fromkeys(
            str(r.get("media_id", ""))
            for r in ratings
            if r.get("media_id") and float(r.get("rating", 0)) > 0
        )
    )

    generated_at = datetime.now(UTC).isoformat()
    total_upserted = 0

    for uid in unique_users:
        scored: list[tuple[float, str]] = []
        for iid in unique_items:
            try:
                pred = algo.predict(uid, iid)
                score = float(pred.est)
            except Exception:  # noqa: BLE001
                import logging  # noqa: PLC0415
                logging.getLogger(__name__).debug(
                    "predict failed for uid=%s iid=%s", uid, iid, exc_info=True
                )
                continue
            scored.append((score, iid))

        scored.sort(reverse=True)
        top = scored[:top_n]

        rows = [
            {
                "user_id": uid,
                "movie_id": iid,
                "score": score,
                "algo": algo_name,
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

    print(f"[svd] upserted {total_upserted} recommendation rows (algo={algo_name})")
    return total_upserted


def run_svd_training() -> None:
    """Entry point — fetch ratings, train SVD, save model, generate recommendations."""
    supabase_url = get_env("SUPABASE_URL")
    service_key = get_env("SUPABASE_SERVICE_ROLE_KEY")

    ratings = fetch_ratings(supabase_url, service_key)
    if not ratings:
        print("[svd] no ratings found — skipping")
        return

    dataset = build_surprise_dataset(ratings)
    print(f"[svd] loaded {len(ratings)} ratings")

    model = train_svd(dataset)
    model_path = os.environ.get("SVD_MODEL_PATH") or os.path.join(
        os.environ.get("TMPDIR", "/tmp"), "svd_model.pkl"  # noqa: S108
    )
    save_model(model, model_path)
    print(f"[svd] model saved to {model_path}")

    top_n = int(os.environ.get("RECS_TOP_N", "50"))
    generate_and_store_recommendations(
        model,
        ratings,
        supabase_url,
        service_key,
        algo_name="surprise-svd",
        top_n=top_n,
    )


if __name__ == "__main__":
    try:
        run_svd_training()
    except RuntimeError as exc:
        print(f"[svd] error: {exc}", file=sys.stderr)
        sys.exit(1)
