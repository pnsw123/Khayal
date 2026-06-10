"""Recommendation model training script using cornac (BPR / MF)."""

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
    """Fetch user ratings from Supabase.

    Queries both ``movie_ratings`` and ``tv_series_ratings`` and merges the
    results into a unified list.  Each row is normalised to:

        {"user_id": str, "media_id": str, "rating": float, "media_type": "movie" | "tv"}

    This preserves the original media type so that
    :func:`generate_and_store_recommendations` can write to the correct
    nullable column (``movie_id`` vs ``tv_series_id``) in the
    ``recommendations`` table.
    """
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase is required: pip install supabase") from exc

    client = create_client(supabase_url, service_key)
    rows: list[dict[str, Any]] = []

    # Movie ratings
    movie_result = (
        client.table("movie_ratings")
        .select("user_id, movie_id, rating")
        .execute()
    )
    for r in (movie_result.data or []):
        if isinstance(r, dict):
            rows.append({
                "user_id": r.get("user_id", ""),
                "media_id": str(r.get("movie_id", "")),
                "rating": float(r.get("rating", 0.0)),
                "media_type": "movie",
            })

    # TV-series ratings
    tv_result = (
        client.table("tv_series_ratings")
        .select("user_id, tv_series_id, rating")
        .execute()
    )
    for r in (tv_result.data or []):
        if isinstance(r, dict):
            rows.append({
                "user_id": r.get("user_id", ""),
                "media_id": str(r.get("tv_series_id", "")),
                "rating": float(r.get("rating", 0.0)),
                "media_type": "tv",
            })

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
        zip(user_ids, item_ids, rating_vals, strict=False)
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
    item_media_types: dict[str, str] | None = None,
) -> int:
    """Generate top-N recommendations per user and upsert to Supabase.

    ``item_media_types`` maps item-id strings to ``"movie"`` or ``"tv"``.
    Items without an entry default to ``"movie"`` for backward-compatibility.

    Movie recommendations are written to ``movie_id`` (``tv_series_id=None``);
    TV recommendations are written to ``tv_series_id`` (``movie_id=None``).
    The two media types are upserted separately with the correct conflict key:
    ``user_id,movie_id,source`` and ``user_id,tv_series_id,source``.

    Returns the total number of rows upserted.
    """
    try:
        from supabase import create_client
    except ImportError as exc:
        raise RuntimeError("supabase is required: pip install supabase") from exc

    from datetime import datetime
    from typing import cast as _cast

    client = create_client(supabase_url, service_key)

    unique_users = list(dict.fromkeys(user_ids))
    unique_items = list(dict.fromkeys(item_ids))
    media_types: dict[str, str] = item_media_types or {}
    generated_at = datetime.now(UTC).isoformat()

    total_upserted = 0
    for uid in unique_users:
        scored: list[tuple[float, str]] = []
        for iid in unique_items:
            try:
                score = float(model.score(uid, iid))
            except Exception:  # noqa: BLE001
                import logging  # noqa: PLC0415
                logging.getLogger(__name__).debug(
                    "score failed for uid=%s iid=%s", uid, iid, exc_info=True
                )
                continue
            scored.append((score, iid))

        scored.sort(reverse=True)
        top = scored[:top_n]

        movie_rows: list[dict[str, Any]] = []
        tv_rows: list[dict[str, Any]] = []
        for score, iid in top:
            media_type = media_types.get(iid, "movie")
            if media_type == "tv":
                tv_rows.append({
                    "user_id": uid,
                    "movie_id": None,
                    "tv_series_id": int(iid),
                    "score": score,
                    "source": algo,
                    "created_at": generated_at,
                })
            else:
                movie_rows.append({
                    "user_id": uid,
                    "movie_id": int(iid),
                    "tv_series_id": None,
                    "score": score,
                    "source": algo,
                    "created_at": generated_at,
                })

        if movie_rows:
            client.table("recommendations").upsert(
                _cast(Any, movie_rows),
                on_conflict="user_id,movie_id,source",
            ).execute()
            total_upserted += len(movie_rows)

        if tv_rows:
            client.table("recommendations").upsert(
                _cast(Any, tv_rows),
                on_conflict="user_id,tv_series_id,source",
            ).execute()
            total_upserted += len(tv_rows)

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

    # Build a lookup from item-id → media_type so that the recommendation
    # store step writes to the correct nullable column.
    item_media_types: dict[str, str] = {
        str(r["media_id"]): str(r.get("media_type", "movie"))
        for r in ratings
        if r.get("media_id")
    }

    model = train_bpr_model(user_ids, item_ids, rating_vals)
    model_path = os.environ.get("MODEL_PATH") or os.path.join(
        os.environ.get("TMPDIR", "/tmp"), "bpr_model.pkl"  # noqa: S108
    )
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
        item_media_types=item_media_types,
    )


if __name__ == "__main__":
    try:
        run_training()
    except RuntimeError as exc:
        print(f"[train] error: {exc}", file=sys.stderr)
        sys.exit(1)
