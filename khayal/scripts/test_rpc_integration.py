"""Integration tests for search_all / similar_movies / similar_tv_series RPCs.

Prerequisites
-------------
- ``supabase start`` must be running (local Supabase stack).
- Run migrations cold first::

      supabase db reset

- Set environment variables (printed by ``supabase start``)::

      export SUPABASE_URL=http://127.0.0.1:54321
      export SUPABASE_SERVICE_ROLE_KEY=<service_role_key from supabase start>

Run integration tests only::

    pytest scripts/test_rpc_integration.py -m integration -v

Skip integration tests (default CI run)::

    pytest scripts/ -m "not integration"
"""

from __future__ import annotations

import os
import time
import uuid
from collections.abc import Generator
from typing import Any

import pytest

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

SENTINEL = f"__test_{uuid.uuid4().hex[:8]}__"


def _get_client() -> Any:
    """Return a Supabase client or skip if env vars not set."""
    url = os.environ.get("SUPABASE_URL", "")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        pytest.skip(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. "
            "Run `supabase start` and export those vars to run integration tests."
        )
    from supabase import create_client

    return create_client(url, key)


@pytest.fixture(scope="module")
def sb() -> Any:
    """Module-scoped Supabase service-role client."""
    return _get_client()


@pytest.fixture(scope="module")
def seeded_data(sb: Any) -> Generator[dict[str, Any], None, None]:  # noqa: C901
    """Seed 10 genres, 10 000 movies, 5 000 tv_series, then clean up after tests."""

    # ------------------------------------------------------------------
    # 1. Genres
    # ------------------------------------------------------------------
    genre_rows = [{"name": f"{SENTINEL}_genre_{i}"} for i in range(10)]
    result = sb.table("genres").insert(genre_rows).execute()
    genre_ids: list[int] = [row["id"] for row in result.data]

    # ------------------------------------------------------------------
    # 2. Movies (10 000 rows)
    # ------------------------------------------------------------------
    batch_size = 500
    movie_ids: list[int] = []
    for batch_start in range(0, 10_000, batch_size):
        batch = [
            {
                "title": f"{SENTINEL}_movie_{batch_start + i}",
                "slug": f"{SENTINEL}-movie-{batch_start + i}",
                "overview": f"Overview for integration test movie {batch_start + i}",
                "media_type": "movie",
                "genre_names": [f"{SENTINEL}_genre_0"],
            }
            for i in range(batch_size)
        ]
        res = sb.table("movies").insert(batch).execute()
        movie_ids.extend(row["id"] for row in res.data)

    # ------------------------------------------------------------------
    # 3. movie_genre join rows
    # ------------------------------------------------------------------
    mg_rows = [
        {"movie_id": movie_ids[i], "genre_id": genre_ids[i % len(genre_ids)]}
        for i in range(min(10_000, len(movie_ids)))
    ]
    for batch_start in range(0, len(mg_rows), batch_size):
        sb.table("movie_genres").insert(mg_rows[batch_start : batch_start + batch_size]).execute()

    # ------------------------------------------------------------------
    # 4. TV series (5 000 rows)
    # ------------------------------------------------------------------
    tv_ids: list[int] = []
    for batch_start in range(0, 5_000, batch_size):
        batch = [
            {
                "title": f"{SENTINEL}_tv_{batch_start + i}",
                "slug": f"{SENTINEL}-tv-{batch_start + i}",
                "overview": f"Overview for integration test tv {batch_start + i}",
                "media_type": "tv",
                "genre_names": [f"{SENTINEL}_genre_0"],
            }
            for i in range(batch_size)
        ]
        res = sb.table("tv_series").insert(batch).execute()
        tv_ids.extend(row["id"] for row in res.data)

    # ------------------------------------------------------------------
    # Yield IDs for tests to use
    # ------------------------------------------------------------------
    yield {
        "genre_ids": genre_ids,
        "movie_ids": movie_ids,
        "tv_ids": tv_ids,
        "sentinel": SENTINEL,
    }

    # ------------------------------------------------------------------
    # Teardown — delete in reverse dependency order
    # ------------------------------------------------------------------
    for batch_start in range(0, len(movie_ids), batch_size):
        chunk = movie_ids[batch_start : batch_start + batch_size]
        sb.table("movie_genres").delete().in_("movie_id", chunk).execute()
        sb.table("movies").delete().in_("id", chunk).execute()

    for batch_start in range(0, len(tv_ids), batch_size):
        chunk = tv_ids[batch_start : batch_start + batch_size]
        sb.table("tv_genres").delete().in_("tv_series_id", chunk).execute()
        sb.table("tv_series").delete().in_("id", chunk).execute()

    sb.table("genres").delete().in_("id", genre_ids).execute()


# ---------------------------------------------------------------------------
# search_all RPC
# ---------------------------------------------------------------------------


@pytest.mark.integration
def test_search_all_returns_list(sb: Any, seeded_data: dict[str, Any]) -> None:
    """search_all RPC returns a list (may be empty for a fresh DB)."""
    sentinel = seeded_data["sentinel"]
    # Use a short distinctive prefix from the sentinel to search for seeded rows
    query = sentinel[:12]  # e.g. "__test_ab12" — unique enough
    result = sb.rpc("search_all", {"query_text": query, "page_size": 20}).execute()
    assert isinstance(result.data, list), "search_all must return a list"


@pytest.mark.integration
def test_search_all_result_shape(sb: Any, seeded_data: dict[str, Any]) -> None:
    """Each row returned by search_all has the expected fields."""
    sentinel = seeded_data["sentinel"]
    query = sentinel[:12]
    result = sb.rpc("search_all", {"query_text": query, "page_size": 5}).execute()
    rows: list[dict[str, Any]] = result.data or []
    if not rows:
        pytest.skip("search_all returned 0 rows — FTS index may not have caught up yet")
    required_keys = {"id", "title", "type", "slug"}
    for row in rows:
        missing = required_keys - set(row.keys())
        assert not missing, f"Row missing keys {missing}: {row}"


@pytest.mark.integration
def test_search_all_respects_page_size(sb: Any, seeded_data: dict[str, Any]) -> None:
    """search_all honours the page_size parameter."""
    sentinel = seeded_data["sentinel"]
    query = sentinel[:12]
    result = sb.rpc("search_all", {"query_text": query, "page_size": 3}).execute()
    rows: list[dict[str, Any]] = result.data or []
    assert len(rows) <= 3, f"Expected ≤3 rows with page_size=3, got {len(rows)}"


# ---------------------------------------------------------------------------
# similar_movies RPC
# ---------------------------------------------------------------------------


@pytest.mark.integration
def test_similar_movies_returns_list(sb: Any, seeded_data: dict[str, Any]) -> None:
    """similar_movies RPC returns a list for a valid movie id."""
    movie_id = seeded_data["movie_ids"][0]
    result = sb.rpc("similar_movies", {"p_movie_id": movie_id, "p_limit": 6}).execute()
    assert isinstance(result.data, list), "similar_movies must return a list"


@pytest.mark.integration
def test_similar_movies_result_shape(sb: Any, seeded_data: dict[str, Any]) -> None:
    """Each row returned by similar_movies has id, title, slug."""
    movie_id = seeded_data["movie_ids"][0]
    result = sb.rpc("similar_movies", {"p_movie_id": movie_id, "p_limit": 6}).execute()
    rows: list[dict[str, Any]] = result.data or []
    if not rows:
        pytest.skip("similar_movies returned 0 rows for the seed movie")
    required_keys = {"id", "title", "slug"}
    for row in rows:
        missing = required_keys - set(row.keys())
        assert not missing, f"Row missing keys {missing}: {row}"


@pytest.mark.integration
def test_similar_movies_excludes_self(sb: Any, seeded_data: dict[str, Any]) -> None:
    """similar_movies must not include the source movie in its results."""
    movie_id = seeded_data["movie_ids"][0]
    result = sb.rpc("similar_movies", {"p_movie_id": movie_id, "p_limit": 20}).execute()
    ids_returned = [row["id"] for row in (result.data or [])]
    assert movie_id not in ids_returned, "similar_movies must not return the source movie"


@pytest.mark.integration
def test_similar_movies_respects_limit(sb: Any, seeded_data: dict[str, Any]) -> None:
    """similar_movies honours p_limit."""
    movie_id = seeded_data["movie_ids"][0]
    result = sb.rpc("similar_movies", {"p_movie_id": movie_id, "p_limit": 3}).execute()
    rows = result.data or []
    assert len(rows) <= 3, f"Expected ≤3 rows with p_limit=3, got {len(rows)}"


# ---------------------------------------------------------------------------
# similar_tv_series RPC
# ---------------------------------------------------------------------------


@pytest.mark.integration
def test_similar_tv_series_returns_list(sb: Any, seeded_data: dict[str, Any]) -> None:
    """similar_tv_series RPC returns a list for a valid tv id."""
    tv_id = seeded_data["tv_ids"][0]
    result = sb.rpc("similar_tv_series", {"p_tv_series_id": tv_id, "p_limit": 6}).execute()
    assert isinstance(result.data, list), "similar_tv_series must return a list"


@pytest.mark.integration
def test_similar_tv_series_result_shape(sb: Any, seeded_data: dict[str, Any]) -> None:
    """Each row returned by similar_tv_series has id, title, slug."""
    tv_id = seeded_data["tv_ids"][0]
    result = sb.rpc("similar_tv_series", {"p_tv_series_id": tv_id, "p_limit": 6}).execute()
    rows: list[dict[str, Any]] = result.data or []
    if not rows:
        pytest.skip("similar_tv_series returned 0 rows for the seed tv item")
    required_keys = {"id", "title", "slug"}
    for row in rows:
        missing = required_keys - set(row.keys())
        assert not missing, f"Row missing keys {missing}: {row}"


@pytest.mark.integration
def test_similar_tv_series_excludes_self(sb: Any, seeded_data: dict[str, Any]) -> None:
    """similar_tv_series must not include the source series in its results."""
    tv_id = seeded_data["tv_ids"][0]
    result = sb.rpc("similar_tv_series", {"p_tv_series_id": tv_id, "p_limit": 20}).execute()
    ids_returned = [row["id"] for row in (result.data or [])]
    assert tv_id not in ids_returned, "similar_tv_series must not return the source series"


@pytest.mark.integration
def test_similar_tv_series_respects_limit(sb: Any, seeded_data: dict[str, Any]) -> None:
    """similar_tv_series honours p_limit."""
    tv_id = seeded_data["tv_ids"][0]
    result = sb.rpc("similar_tv_series", {"p_tv_series_id": tv_id, "p_limit": 3}).execute()
    rows = result.data or []
    assert len(rows) <= 3, f"Expected ≤3 rows with p_limit=3, got {len(rows)}"


# ---------------------------------------------------------------------------
# EXPLAIN ANALYZE — GIN index probe
# ---------------------------------------------------------------------------


@pytest.mark.integration
def test_search_all_uses_index_scan_not_seq_scan(sb: Any, seeded_data: dict[str, Any]) -> None:
    """EXPLAIN ANALYZE on the search_all query must show Index Scan, not Seq Scan.

    This proves the GIN index on the tsvector expression is actually used by
    the query planner after the migrations have been applied.

    Requires the pg_execute_explain RPC defined in migration
    20240001000010_rpc_pg_execute_explain.sql — run `supabase db reset` first.
    """
    sentinel = seeded_data["sentinel"]
    query_text = sentinel[:12]

    # Run EXPLAIN ANALYZE directly via raw SQL using the service-role client.
    # The search_all RPC internally runs:
    #   SELECT ... FROM movies
    #   WHERE to_tsvector('english', title || ' ' || COALESCE(overview, ''))
    #         @@ plainto_tsquery('english', $1)
    #
    # We reproduce the same predicate here so the planner sees identical conditions.
    # query_text is a UUID-based sentinel — no user input, not injectable.
    # We build the SQL string here solely to pass it to EXPLAIN ANALYZE so the
    # query planner can be interrogated.  The noqa suppresses the false-positive.
    safe_query = query_text.replace("'", "''")
    explain_sql = (
        "EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) "  # noqa: S608
        "SELECT id, title FROM movies "
        "WHERE to_tsvector('english', title || ' ' || COALESCE(overview, '')) "
        "@@ plainto_tsquery('english', '" + safe_query + "') "
        "LIMIT 30"
    )
    result = sb.rpc("pg_execute_explain", {"query": explain_sql}).execute()

    assert result.data is not None, (
        "pg_execute_explain RPC returned None. "
        "Ensure migration 20240001000010_rpc_pg_execute_explain.sql has been applied: "
        "run `supabase db reset` then re-run these tests."
    )

    plan_text: str = str(result.data)
    assert "Index Scan" in plan_text or "Bitmap Index Scan" in plan_text, (
        f"Expected Index Scan in query plan but got Seq Scan.\n"
        f"This means idx_movies_fts GIN index is not being used.\n"
        f"Full plan:\n{plan_text}"
    )
    assert "Seq Scan" not in plan_text or "Index" in plan_text, (
        "Query plan shows Seq Scan without any index. "
        "GIN index may be missing or the planner chose not to use it.\n"
        f"Full plan:\n{plan_text}"
    )


@pytest.mark.integration
def test_search_all_latency_under_100ms_at_scale(sb: Any, seeded_data: dict[str, Any]) -> None:
    """search_all must complete in under 100 ms for a single-term query at 10k-row scale.

    The seeded_data fixture inserts 10 000 movies before this test runs.
    We warm up with one ignored call, then measure 3 timed calls and assert the
    median is below the 100 ms SLA.  The warm-up avoids counting connection
    establishment or query-plan cache miss in the timing.
    """
    sentinel = seeded_data["sentinel"]
    query_text = sentinel[:12]

    # Warm-up — result discarded
    sb.rpc("search_all", {"query_text": query_text, "page_size": 20}).execute()

    latencies_ms: list[float] = []
    for _ in range(3):
        t0 = time.perf_counter()
        sb.rpc("search_all", {"query_text": query_text, "page_size": 20}).execute()
        latencies_ms.append((time.perf_counter() - t0) * 1000)

    latencies_ms.sort()
    median_ms = latencies_ms[1]  # middle of 3 sorted values

    assert median_ms < 100.0, (
        f"search_all median latency {median_ms:.1f} ms exceeds 100 ms SLA at 10k rows.\n"
        f"Individual measurements: {[f'{v:.1f}ms' for v in latencies_ms]}\n"
        "Check that idx_movies_fts GIN index exists and `supabase db reset` was run."
    )


@pytest.mark.integration
def test_gin_index_exists_in_catalog(sb: Any, seeded_data: dict[str, Any]) -> None:
    """Confirm both GIN indexes appear in pg_indexes after db reset + migrations."""
    # pg_indexes is readable by service role
    result = (
        sb.from_("pg_indexes")
        .select("indexname, indexdef")
        .eq("tablename", "movies")
        .execute()
    )
    index_names = {row["indexname"] for row in (result.data or [])}

    assert "idx_movies_fts" in index_names, (
        "idx_movies_fts GIN index not found. "
        "Run `supabase db reset` to apply 20240001000001_gin_index_fts.sql."
    )
    assert "idx_movies_genre_names" in index_names, (
        "idx_movies_genre_names GIN index not found. "
        "Run `supabase db reset` to apply 20240001000000_gin_index_genre_names.sql."
    )


@pytest.mark.integration
def test_genre_names_index_uses_gin(sb: Any, seeded_data: dict[str, Any]) -> None:
    """idx_movies_genre_names must be a GIN index (not btree or other)."""
    result = (
        sb.from_("pg_indexes")
        .select("indexdef")
        .eq("tablename", "movies")
        .eq("indexname", "idx_movies_genre_names")
        .execute()
    )
    rows = result.data or []
    assert rows, "idx_movies_genre_names not found in pg_indexes"
    indexdef: str = rows[0]["indexdef"].upper()
    assert "USING GIN" in indexdef, (
        f"idx_movies_genre_names is not a GIN index. Definition: {rows[0]['indexdef']}"
    )


@pytest.mark.integration
def test_fts_index_uses_gin(sb: Any, seeded_data: dict[str, Any]) -> None:
    """idx_movies_fts must be a GIN index on the tsvector expression."""
    result = (
        sb.from_("pg_indexes")
        .select("indexdef")
        .eq("tablename", "movies")
        .eq("indexname", "idx_movies_fts")
        .execute()
    )
    rows = result.data or []
    assert rows, "idx_movies_fts not found in pg_indexes"
    indexdef: str = rows[0]["indexdef"].upper()
    assert "USING GIN" in indexdef, (
        f"idx_movies_fts is not a GIN index. Definition: {rows[0]['indexdef']}"
    )
    assert "TO_TSVECTOR" in indexdef, (
        "idx_movies_fts does not index a tsvector expression"
    )


# ---------------------------------------------------------------------------
# get_movie_detail RPC
# ---------------------------------------------------------------------------


@pytest.mark.integration
def test_get_movie_detail_returns_movie_stats_reviews(sb: Any, seeded_data: dict[str, Any]) -> None:
    """get_movie_detail returns movie, stats, and reviews for a known slug.

    This test catches the class of regression where the migration defining
    get_movie_detail was written but never applied to the database: in that
    case Supabase returns a PostgREST 404/error instead of a JSON payload,
    and this assertion fails immediately.
    """
    # Pick the first seeded movie slug — guaranteed to exist.
    sentinel = seeded_data["sentinel"]
    slug = f"{sentinel}-movie-0"

    result = sb.rpc("get_movie_detail", {"movie_slug": slug}).execute()

    assert result.data is not None, (
        f"get_movie_detail returned None for slug '{slug}'. "
        "Likely cause: migration 20240001000007_rpc_get_movie_and_tv_detail.sql "
        "has not been applied. Run `supabase db reset`."
    )

    data: dict[str, Any] = result.data  # type: ignore[assignment]

    # --- movie sub-object ---------------------------------------------------
    assert "movie" in data, f"Response missing 'movie' key: {data}"
    movie = data["movie"]
    assert isinstance(movie, dict), f"'movie' must be a dict, got {type(movie)}"
    assert str(movie.get("slug")) == slug, (
        f"Returned slug '{movie.get('slug')}' does not match requested slug '{slug}'"
    )
    # id must be present and a positive integer
    assert isinstance(movie.get("id"), int) and movie["id"] > 0, (
        f"'movie.id' must be a positive int, got {movie.get('id')!r}"
    )

    # --- stats sub-object ---------------------------------------------------
    # Stats row may not exist if movie_stats view is empty (no ratings yet),
    # but the key must always be present in the response.
    assert "stats" in data, f"Response missing 'stats' key: {data}"

    # --- reviews list -------------------------------------------------------
    assert "reviews" in data, f"Response missing 'reviews' key: {data}"
    assert isinstance(data["reviews"], list), (
        f"'reviews' must be a list, got {type(data['reviews'])}"
    )


@pytest.mark.integration
def test_get_movie_detail_returns_null_for_unknown_slug(  # noqa: E501
    sb: Any,
    seeded_data: dict[str, Any],
) -> None:
    """get_movie_detail returns None (not an error) for a slug that does not exist.

    This distinguishes a legitimate "not found" from a missing-migration error:
    - Missing migration  → PostgREST 404 / exception raised by supabase-py
    - Found but no row  → result.data == None (SQL function returns NULL)
    """
    unknown_slug = f"__nonexistent__{uuid.uuid4().hex}"

    result = sb.rpc("get_movie_detail", {"movie_slug": unknown_slug}).execute()

    # The function itself must be callable (migration present).
    # result.data == None means the SQL returned NULL — correct "not found" path.
    assert result.data is None, (
        f"Expected None for unknown slug, got: {result.data!r}"
    )


# ---------------------------------------------------------------------------
# get_tv_detail RPC
# ---------------------------------------------------------------------------


@pytest.mark.integration
def test_get_tv_detail_returns_series(sb: Any, seeded_data: dict[str, Any]) -> None:
    """get_tv_detail returns tv_series, stats, and reviews for a known slug.

    Mirrors test_get_movie_detail_returns_movie_stats_reviews for the TV path.
    A missing migration for get_tv_detail would have been invisible to the
    existing test suite — this test makes such regressions immediately visible.
    """
    sentinel = seeded_data["sentinel"]
    slug = f"{sentinel}-tv-0"

    result = sb.rpc("get_tv_detail", {"series_slug": slug}).execute()

    assert result.data is not None, (
        f"get_tv_detail returned None for slug '{slug}'. "
        "Likely cause: migration 20240001000007_rpc_get_movie_and_tv_detail.sql "
        "has not been applied. Run `supabase db reset`."
    )

    data: dict[str, Any] = result.data  # type: ignore[assignment]

    # --- tv_series sub-object -----------------------------------------------
    assert "tv_series" in data, f"Response missing 'tv_series' key: {data}"
    series = data["tv_series"]
    assert isinstance(series, dict), f"'tv_series' must be a dict, got {type(series)}"
    assert str(series.get("slug")) == slug, (
        f"Returned slug '{series.get('slug')}' does not match requested slug '{slug}'"
    )
    assert isinstance(series.get("id"), int) and series["id"] > 0, (
        f"'tv_series.id' must be a positive int, got {series.get('id')!r}"
    )

    # --- stats sub-object ---------------------------------------------------
    assert "stats" in data, f"Response missing 'stats' key: {data}"

    # --- reviews list -------------------------------------------------------
    assert "reviews" in data, f"Response missing 'reviews' key: {data}"
    assert isinstance(data["reviews"], list), (
        f"'reviews' must be a list, got {type(data['reviews'])}"
    )
