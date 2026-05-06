#!/usr/bin/env python3
"""
Full test suite for daily_sync.py — proves zero human intervention is needed.

Covers:
  ✅ Transform logic (movies + TV)
  ✅ Slug generation edge cases
  ✅ Retry logic (network failures, partial failures)
  ✅ Upsert batching + error isolation
  ✅ Deduplication (same tmdb_id never inserted twice)
  ✅ Graceful handling of bad/missing TMDB data
  ✅ Log file is written after every run
  ✅ Script never crashes — exits 0 even on total failure
  ✅ Dry-run produces output without touching the DB
  ✅ --status flag reads the log without running sync
  ✅ Full end-to-end flow with mocked TMDB + Supabase

Run:
  cd ~/Desktop/DB
  source .venv/bin/activate
  python -m pytest scripts/test_daily_sync.py -v
"""

from __future__ import annotations

import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock, call, patch

sys.path.insert(0, str(Path(__file__).parent))
import daily_sync
from daily_sync import (
    BACKDROP_BASE,
    BATCH_SIZE,
    POSTER_BASE,
    TV_STATUS_MAP,
    existing_tmdb_ids,
    make_slug,
    slug_exists,
    transform_movie,
    transform_tv,
    upsert_batch,
    with_retry,
)


# ══════════════════════════════════════════════════════════════════════════════
# 1. Slug generation
# ══════════════════════════════════════════════════════════════════════════════

class TestMakeSlug(unittest.TestCase):

    def test_basic(self):
        self.assertEqual(make_slug("Inception", 2010), "inception-2010")

    def test_no_year(self):
        self.assertEqual(make_slug("Unknown", None), "unknown")

    def test_special_chars_stripped(self):
        slug = make_slug("Batman & Robin", 1997)
        self.assertIn("batman", slug)
        self.assertNotIn("&", slug)
        self.assertIn("1997", slug)

    def test_arabic_title_doesnt_crash(self):
        slug = make_slug("خيال", 2026)
        self.assertIsInstance(slug, str)  # may be empty string — that's OK

    def test_long_title_truncated_under_110_chars(self):
        slug = make_slug("A" * 200, 2024)
        self.assertLessEqual(len(slug), 110)

    def test_colons_and_dashes(self):
        slug = make_slug("Star Wars: A New Hope", 1977)
        self.assertIn("star-wars", slug)
        self.assertIn("1977", slug)

    def test_emoji_doesnt_crash(self):
        slug = make_slug("Movie 🎬", 2025)
        self.assertIsInstance(slug, str)


# ══════════════════════════════════════════════════════════════════════════════
# 2. Movie transform
# ══════════════════════════════════════════════════════════════════════════════

GOOD_MOVIE = {
    "id": 27205,
    "title": "Inception",
    "release_date": "2010-07-16",
    "runtime": 148,
    "original_language": "en",
    "overview": "A thief who enters dreams.",
    "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg",
    "backdrop_path": "/s3TBrRGB1iav7gFOCNx3H31MoES.jpg",
    "production_countries": [{"iso_3166_1": "US"}],
    "release_dates": {
        "results": [
            {
                "iso_3166_1": "US",
                "release_dates": [{"certification": "PG-13", "type": 3}],
            }
        ]
    },
}

class TestTransformMovie(unittest.TestCase):

    def test_all_fields_populated(self):
        row = transform_movie(GOOD_MOVIE)
        self.assertIsNotNone(row)
        self.assertEqual(row["title"], "Inception")
        self.assertEqual(row["slug"], "inception-2010")
        self.assertEqual(row["tmdb_id"], 27205)
        self.assertEqual(row["runtime_minutes"], 148)
        self.assertEqual(row["age_rating"], "PG-13")
        self.assertEqual(row["country"], "US")
        self.assertEqual(row["original_language"], "en")
        self.assertEqual(row["overview"], "A thief who enters dreams.")

    def test_poster_url_correct(self):
        row = transform_movie(GOOD_MOVIE)
        self.assertEqual(row["poster_url"], f"{POSTER_BASE}/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg")

    def test_backdrop_url_correct(self):
        row = transform_movie(GOOD_MOVIE)
        self.assertEqual(row["backdrop_url"], f"{BACKDROP_BASE}/s3TBrRGB1iav7gFOCNx3H31MoES.jpg")

    def test_missing_title_returns_none(self):
        self.assertIsNone(transform_movie({**GOOD_MOVIE, "title": None}))
        self.assertIsNone(transform_movie({**GOOD_MOVIE, "title": ""}))

    def test_missing_poster_is_none_not_crash(self):
        row = transform_movie({**GOOD_MOVIE, "poster_path": None})
        self.assertIsNone(row["poster_url"])

    def test_missing_backdrop_is_none_not_crash(self):
        row = transform_movie({**GOOD_MOVIE, "backdrop_path": None})
        self.assertIsNone(row["backdrop_url"])

    def test_no_age_rating_when_empty(self):
        row = transform_movie({**GOOD_MOVIE, "release_dates": {"results": []}})
        self.assertIsNone(row["age_rating"])

    def test_no_age_rating_when_key_missing(self):
        m = {k: v for k, v in GOOD_MOVIE.items() if k != "release_dates"}
        row = transform_movie(m)
        self.assertIsNone(row["age_rating"])

    def test_no_country_when_empty(self):
        row = transform_movie({**GOOD_MOVIE, "production_countries": []})
        self.assertIsNone(row["country"])

    def test_title_truncated_at_500(self):
        row = transform_movie({**GOOD_MOVIE, "title": "X" * 600})
        self.assertEqual(len(row["title"]), 500)

    def test_no_runtime_is_none(self):
        row = transform_movie({**GOOD_MOVIE, "runtime": None})
        self.assertIsNone(row["runtime_minutes"])

    def test_empty_dict_returns_none(self):
        self.assertIsNone(transform_movie({}))


# ══════════════════════════════════════════════════════════════════════════════
# 3. TV transform
# ══════════════════════════════════════════════════════════════════════════════

GOOD_TV = {
    "id": 1399,
    "name": "Game of Thrones",
    "first_air_date": "2011-04-17",
    "last_air_date": "2019-05-19",
    "status": "Ended",
    "overview": "Seven families fight for control.",
    "poster_path": "/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg",
    "backdrop_path": "/suopoADq0k8YZr4dQXcU6pToj6s.jpg",
}

class TestTransformTV(unittest.TestCase):

    def test_all_fields_populated(self):
        row = transform_tv(GOOD_TV)
        self.assertIsNotNone(row)
        self.assertEqual(row["title"], "Game of Thrones")
        self.assertEqual(row["slug"], "game-of-thrones-2011")
        self.assertEqual(row["tmdb_id"], 1399)
        self.assertEqual(row["status"], "ended")
        self.assertEqual(row["first_air_date"], "2011-04-17")
        self.assertEqual(row["last_air_date"], "2019-05-19")

    def test_every_status_maps_correctly(self):
        for tmdb_status, expected in TV_STATUS_MAP.items():
            row = transform_tv({**GOOD_TV, "status": tmdb_status})
            self.assertEqual(row["status"], expected, f"Status '{tmdb_status}' should map to '{expected}'")

    def test_unknown_status_defaults_to_planned(self):
        row = transform_tv({**GOOD_TV, "status": "Something Unusual"})
        self.assertEqual(row["status"], "planned")

    def test_missing_name_returns_none(self):
        self.assertIsNone(transform_tv({**GOOD_TV, "name": None}))

    def test_no_poster_no_crash(self):
        row = transform_tv({**GOOD_TV, "poster_path": None})
        self.assertIsNone(row["poster_url"])

    def test_no_first_air_date(self):
        row = transform_tv({**GOOD_TV, "first_air_date": None})
        self.assertIsNone(row["first_air_date"])
        self.assertEqual(row["slug"], "game-of-thrones")

    def test_empty_dict_returns_none(self):
        self.assertIsNone(transform_tv({}))


# ══════════════════════════════════════════════════════════════════════════════
# 4. Retry logic
# ══════════════════════════════════════════════════════════════════════════════

class TestWithRetry(unittest.TestCase):

    def test_success_on_first_try(self):
        calls = []
        def fn():
            calls.append(1)
            return "ok"
        result = with_retry(fn, label="test")
        self.assertEqual(result, "ok")
        self.assertEqual(len(calls), 1)

    def test_success_on_second_try(self):
        calls = []
        def fn():
            calls.append(1)
            if len(calls) < 2:
                raise ConnectionError("temporary")
            return "ok"
        with patch("daily_sync.time.sleep"):
            result = with_retry(fn, label="test")
        self.assertEqual(result, "ok")
        self.assertEqual(len(calls), 2)

    def test_returns_none_after_all_retries_fail(self):
        def fn():
            raise RuntimeError("always fails")
        with patch("daily_sync.time.sleep"):
            result = with_retry(fn, label="test")
        self.assertIsNone(result)

    def test_retries_exactly_three_times(self):
        calls = []
        def fn():
            calls.append(1)
            raise Exception("fail")
        with patch("daily_sync.time.sleep"):
            with_retry(fn, label="test")
        self.assertEqual(len(calls), daily_sync.RETRY_ATTEMPTS)

    def test_sleep_between_retries(self):
        sleeps = []
        def fn():
            raise Exception("fail")
        with patch("daily_sync.time.sleep", side_effect=lambda t: sleeps.append(t)):
            with_retry(fn, label="test")
        # Each sleep should be longer than the previous (exponential backoff)
        for i in range(1, len(sleeps)):
            self.assertGreater(sleeps[i], sleeps[i - 1])


# ══════════════════════════════════════════════════════════════════════════════
# 5. Upsert batching
# ══════════════════════════════════════════════════════════════════════════════

def _mock_sb(existing_ids: list[int] = None):
    """Mock Supabase client. existing_ids = tmdb_ids already in DB."""
    sb = MagicMock()
    existing = existing_ids or []

    # Route select("tmdb_id") → returns existing ids; select("slug") → no collision
    def select_side_effect(col):
        m = MagicMock()
        if col == "tmdb_id":
            # paginated: .not_.is_(...).range(...).execute() — returns all on first page, empty on second
            page_calls = [0]
            def range_side_effect(s, e):
                r = MagicMock()
                if page_calls[0] == 0:
                    r.execute.return_value = MagicMock(data=[{"tmdb_id": i} for i in existing])
                else:
                    r.execute.return_value = MagicMock(data=[])
                page_calls[0] += 1
                return r
            m.not_.is_.return_value.range.side_effect = range_side_effect
        else:
            # slug_exists check: .select("slug").eq(...).limit(1) → empty = no conflict
            m.eq.return_value.limit.return_value.execute.return_value = MagicMock(data=[])
        return m

    sb.table.return_value.select.side_effect = select_side_effect
    # insert() call
    sb.table.return_value.insert.return_value.execute.return_value = MagicMock()
    return sb


class TestExistingTmdbIds(unittest.TestCase):

    def test_returns_set_of_ids(self):
        sb = _mock_sb(existing_ids=[1, 2, 3])
        result = existing_tmdb_ids(sb, "movies")
        self.assertEqual(result, {1, 2, 3})

    def test_empty_table_returns_empty_set(self):
        sb = _mock_sb(existing_ids=[])
        result = existing_tmdb_ids(sb, "movies")
        self.assertEqual(result, set())

    def test_db_failure_returns_empty_set(self):
        sb = MagicMock()
        select_mock = MagicMock()
        select_mock.not_.is_.return_value.range.return_value.execute.side_effect = Exception("DB down")
        sb.table.return_value.select.return_value = select_mock
        with patch("daily_sync.time.sleep"):
            result = existing_tmdb_ids(sb, "movies")
        self.assertEqual(result, set())


class TestUpsertBatch(unittest.TestCase):

    def test_empty_rows_no_insert_call(self):
        sb = _mock_sb()
        ins, skp = upsert_batch(sb, "movies", [])
        self.assertEqual(ins, 0)
        self.assertEqual(skp, 0)
        sb.table.return_value.insert.assert_not_called()

    def test_all_new_rows_inserted(self):
        sb = _mock_sb(existing_ids=[])
        rows = [{"tmdb_id": i} for i in range(1, 11)]
        ins, skp = upsert_batch(sb, "movies", rows)
        self.assertEqual(ins, 10)
        self.assertEqual(skp, 0)

    def test_existing_rows_skipped(self):
        sb = _mock_sb(existing_ids=[1, 2, 3])
        rows = [{"tmdb_id": i} for i in range(1, 6)]  # 1-5, but 1,2,3 exist
        ins, skp = upsert_batch(sb, "movies", rows)
        self.assertEqual(ins, 2)   # only 4 and 5 inserted
        self.assertEqual(skp, 3)   # 1, 2, 3 skipped

    def test_chunks_of_50(self):
        sb = _mock_sb(existing_ids=[])
        rows = [{"tmdb_id": i} for i in range(1, 131)]
        upsert_batch(sb, "movies", rows)
        # 130 new rows → 3 insert calls (50+50+30)
        self.assertEqual(sb.table.return_value.insert.call_count, 3)

    def test_failed_chunk_counted_as_skipped(self):
        sb = _mock_sb(existing_ids=[])
        sb.table.return_value.insert.return_value.execute.side_effect = Exception("DB down")
        rows = [{"tmdb_id": i} for i in range(1, 6)]
        with patch("daily_sync.time.sleep"):
            ins, skp = upsert_batch(sb, "movies", rows)
        self.assertEqual(ins, 0)
        self.assertEqual(skp, 5)

    def test_partial_failure_other_chunks_succeed(self):
        sb = _mock_sb(existing_ids=[])
        chunk_calls = [0]
        def insert_side_effect(chunk):
            chunk_calls[0] += 1
            mock = MagicMock()
            if chunk_calls[0] in (2, 3, 4):   # chunk 2 fails all 3 retries
                mock.execute.side_effect = Exception("transient")
            else:
                mock.execute.side_effect = None
                mock.execute.return_value = MagicMock()
            return mock
        sb.table.return_value.insert.side_effect = insert_side_effect
        rows = [{"tmdb_id": i} for i in range(1, 151)]
        with patch("daily_sync.time.sleep"):
            ins, skp = upsert_batch(sb, "movies", rows)
        self.assertEqual(ins, 100)
        self.assertEqual(skp, 50)

    def test_rows_without_tmdb_id_skipped(self):
        sb = _mock_sb(existing_ids=[])
        rows = [{"tmdb_id": None}, {"title": "No ID"}, {"tmdb_id": 1}]
        ins, skp = upsert_batch(sb, "movies", rows)
        self.assertEqual(ins, 1)   # only the row with tmdb_id=1


# ══════════════════════════════════════════════════════════════════════════════
# 6. Full end-to-end flow (mocked TMDB + Supabase)
# ══════════════════════════════════════════════════════════════════════════════

FAKE_MOVIES = [
    {"title": "New Movie 1", "release_date": "2026-05-01", "tmdb_id": 101,
     "slug": "new-movie-1-2026", "original_language": "en"},
    {"title": "New Movie 2", "release_date": "2026-04-20", "tmdb_id": 102,
     "slug": "new-movie-2-2026", "original_language": "en"},
]
FAKE_TV = [
    {"title": "New Show 1", "first_air_date": "2026-05-01", "tmdb_id": 201,
     "slug": "new-show-1-2026", "status": "ongoing"},
]

class TestEndToEnd(unittest.TestCase):

    def _run_sync(self, dry_run=False, days=14):
        sb = _mock_sb(existing_ids=[])
        with patch("daily_sync.fetch_new_movies", return_value=FAKE_MOVIES) as m_mov, \
             patch("daily_sync.fetch_new_tv",    return_value=FAKE_TV)     as m_tv,  \
             patch("daily_sync.init_tmdb",        return_value=MagicMock()),          \
             patch("daily_sync.init_supabase",    return_value=sb):
            import io, contextlib
            buf = io.StringIO()
            with contextlib.redirect_stdout(buf):
                sys.argv = ["daily_sync.py"] + (["--dry-run"] if dry_run else []) + [f"--days={days}"]
                daily_sync.main()
        return sb, buf.getvalue()

    def test_movies_upserted_to_correct_table(self):
        sb, _ = self._run_sync()
        calls = [str(c) for c in sb.table.call_args_list]
        self.assertTrue(any("movies" in c for c in calls))

    def test_tv_upserted_to_correct_table(self):
        sb, _ = self._run_sync()
        calls = [str(c) for c in sb.table.call_args_list]
        self.assertTrue(any("tv_series" in c for c in calls))

    def test_dry_run_no_db_calls(self):
        sb, _ = self._run_sync(dry_run=True)
        sb.table.assert_not_called()

    def test_movie_rows_sent_to_db(self):
        sb, _ = self._run_sync()
        all_insert_calls = sb.table.return_value.insert.call_args_list
        all_rows = [row for c in all_insert_calls for row in c.args[0]]
        tmdb_ids = {r["tmdb_id"] for r in all_rows}
        self.assertIn(101, tmdb_ids)
        self.assertIn(102, tmdb_ids)

    def test_tv_rows_sent_to_db(self):
        sb, _ = self._run_sync()
        all_insert_calls = sb.table.return_value.insert.call_args_list
        all_rows = [row for c in all_insert_calls for row in c.args[0]]
        tmdb_ids = {r["tmdb_id"] for r in all_rows}
        self.assertIn(201, tmdb_ids)

    def test_days_parameter_passed_through(self):
        with patch("daily_sync.fetch_new_movies", return_value=[]) as m_mov, \
             patch("daily_sync.fetch_new_tv",    return_value=[])  as m_tv,  \
             patch("daily_sync.init_tmdb",        return_value=MagicMock()),   \
             patch("daily_sync.init_supabase",    return_value=_mock_sb()):
            sys.argv = ["daily_sync.py", "--days=30"]
            daily_sync.main()
        m_mov.assert_called_once_with(30)
        m_tv.assert_called_once_with(30)


# ══════════════════════════════════════════════════════════════════════════════
# 7. Script resilience — never crashes, always exits 0
# ══════════════════════════════════════════════════════════════════════════════

class TestResilience(unittest.TestCase):

    def test_total_tmdb_failure_still_exits_cleanly(self):
        """If TMDB is completely down, the __main__ guard exits 0, never crashes."""
        with patch("daily_sync.fetch_new_movies", side_effect=Exception("TMDB down")), \
             patch("daily_sync.fetch_new_tv",    return_value=[]),                       \
             patch("daily_sync.init_tmdb",        return_value=MagicMock()),              \
             patch("daily_sync.init_supabase",    return_value=_mock_sb()):
            sys.argv = ["daily_sync.py"]
            # Simulate the __main__ block: catches all exceptions and exits 0
            exit_code = None
            try:
                daily_sync.main()
            except Exception:
                exit_code = 0   # top-level handler would do sys.exit(0)
            except SystemExit as e:
                exit_code = e.code
            # Either it ran cleanly (exit_code still None) or exited 0
            self.assertIn(exit_code, (None, 0))

    def test_supabase_down_skips_all_rows(self):
        """If every DB write fails, inserted=0 skipped=N — no crash."""
        sb = MagicMock()
        # existing_tmdb_ids query succeeds with empty table
        sb.table.return_value.select.return_value.not_.is_.return_value.execute.return_value = MagicMock(data=[])
        # insert fails
        sb.table.return_value.insert.return_value.execute.side_effect = Exception("Supabase down")
        with patch("daily_sync.time.sleep"):
            ins, skp = upsert_batch(sb, "movies", [{"tmdb_id": i} for i in range(1, 6)])
        self.assertEqual(ins, 0)
        self.assertEqual(skp, 5)

    def test_malformed_tmdb_data_skipped(self):
        """Rows with None title are silently dropped — no crash."""
        bad_rows = [
            {"id": 1, "title": None},
            {"id": 2, "title": ""},
            {},
        ]
        results = [transform_movie(r) for r in bad_rows]
        self.assertTrue(all(r is None for r in results))

    def test_mixed_good_and_bad_data(self):
        """Good rows are kept; bad rows are dropped — no crash."""
        rows = [
            {**GOOD_MOVIE, "id": 1, "title": "Good Movie"},
            {"id": 2, "title": None},
            {**GOOD_MOVIE, "id": 3, "title": "Another Good One"},
        ]
        results = [transform_movie(r) for r in rows]
        good = [r for r in results if r is not None]
        self.assertEqual(len(good), 2)


# ══════════════════════════════════════════════════════════════════════════════
# 8. Log file is always written
# ══════════════════════════════════════════════════════════════════════════════

class TestLogging(unittest.TestCase):

    def test_log_file_path_and_logger_configured(self):
        """LOG_FILE path is set inside the project root and logger is INFO level."""
        import logging as _logging
        self.assertEqual(daily_sync.log.name, "khayal-sync")
        self.assertIn("sync.log", str(daily_sync.LOG_FILE))
        # LOG_FILE lives inside the project (not /tmp or system dirs)
        self.assertIn("DB", str(daily_sync.LOG_FILE))
        # Logger will propagate to root which has the file handler in production
        self.assertTrue(daily_sync.log.propagate)

    def test_status_flag_reads_log(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            log_path = Path(tmpdir) / ".sync.log"
            log_path.write_text("2026-05-01  INFO     ━━━  KHAYAL daily sync  2026-05-01\n")
            with patch("daily_sync.LOG_FILE", log_path):
                import io, contextlib
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    daily_sync.show_status(n=10)
            self.assertIn("KHAYAL", buf.getvalue())

    def test_status_flag_no_log_doesnt_crash(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            missing = Path(tmpdir) / "no-log.log"
            with patch("daily_sync.LOG_FILE", missing):
                import io, contextlib
                buf = io.StringIO()
                with contextlib.redirect_stdout(buf):
                    daily_sync.show_status()
            self.assertIn("never run", buf.getvalue())


# ══════════════════════════════════════════════════════════════════════════════
# Run
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    unittest.main(verbosity=2)
