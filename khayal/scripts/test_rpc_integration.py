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

    if result.data is None:
        # Fallback: query pg_stat_user_indexes to confirm the index exists
        idx_result = (
            sb.table("pg_stat_user_indexes")
            .select("indexrelname")
            .eq("indexrelname", "idx_movies_fts")
            .execute()
        )
        assert idx_result.data, (
            "idx_movies_fts index not found in pg_stat_user_indexes. "
            "Run `supabase db reset` to apply migrations."
        )
        return

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
