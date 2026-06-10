"""SVD recommendation training script using scikit-surprise."""

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


def clamp_rating(value: float, min_val: float = 1.0, max_val: float = 10.0) -> float:
    """Clamp a rating to [min_val, max_val]."""
    return max(min_val, min(max_val, value))


def build_surprise_dataset(
    ratings: list[dict[str, Any]],
    rating_scale: tuple[float, float] = (1.0, 10.0),
) -> Any:
    """Convert rating dicts into a surprise Dataset."""
    try:
        from surprise import Dataset, Reader  # noqa: PLC0415
        import pandas as pd  # noqa: PLC0415
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


def run_svd_training() -> None:
    """Entry point — fetch ratings, train SVD, save model."""
    supabase_url = get_env("SUPABASE_URL")
    service_key = get_env("SUPABASE_SERVICE_KEY")

    ratings = fetch_ratings(supabase_url, service_key)
    if not ratings:
        print("[svd] no ratings found — skipping")
        return

    dataset = build_surprise_dataset(ratings)
    print(f"[svd] loaded {len(ratings)} ratings")

    model = train_svd(dataset)
    model_path = os.environ.get("SVD_MODEL_PATH", "/tmp/svd_model.pkl")
    save_model(model, model_path)
    print(f"[svd] model saved to {model_path}")


if __name__ == "__main__":
    try:
        run_svd_training()
    except RuntimeError as exc:
        print(f"[svd] error: {exc}", file=sys.stderr)
        sys.exit(1)
