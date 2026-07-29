import io
import json
import os
import tempfile
import time
import unittest
import urllib.error
from contextlib import redirect_stderr, redirect_stdout
from datetime import datetime, timezone
from pathlib import Path
from unittest import mock

from scripts import update_google_places as places


def cafe(**values):
    item = {"id": "cafe-1", "name": "喫茶コモン", "address": "東京都江東区白河1丁目"}
    item.update(values)
    return item


class FakeResponse:
    def __init__(self, value):
        self.value = value

    def __enter__(self):
        return io.BytesIO(json.dumps(self.value).encode())

    def __exit__(self, *_args):
        return False


class UpdateGooglePlacesTest(unittest.TestCase):
    def test_existing_place_id_only_uses_details(self):
        cafes = [cafe(googlePlaceId="known")]
        calls = []

        def request(url, _key, fields, **_kwargs):
            calls.append((url, fields))
            return {"id": "known", "rating": 4.5, "userRatingCount": 20}

        stats = places.update_cafes(cafes, "secret", request_json=request)
        self.assertEqual(calls, [(f"{places.API_ROOT}/places/known", places.DETAIL_FIELDS)])
        self.assertEqual(stats["success"], 1)

    def test_mismatched_details_id_is_rejected_without_search(self):
        original = cafe(googlePlaceId="known", googleRating=4.0)
        cafes = [original.copy()]
        calls = []

        def request(url, *_args, **_kwargs):
            calls.append(url)
            return {"id": "different", "rating": 5.0}

        with redirect_stderr(io.StringIO()):
            stats = places.update_cafes(cafes, "secret", request_json=request)
        self.assertEqual(calls, [f"{places.API_ROOT}/places/known"])
        self.assertEqual(cafes[0], original)
        self.assertEqual((stats["success"], stats["failed"]), (0, 1))

    def test_missing_place_id_searches_and_saves_confident_match(self):
        cafes = [cafe()]

        def request(url, _key, fields, **kwargs):
            self.assertEqual(url, f"{places.API_ROOT}/places:searchText")
            self.assertEqual(fields, places.SEARCH_FIELDS)
            self.assertIn("喫茶コモン", kwargs["body"]["textQuery"])
            return {"places": [{"id": "new-id", "displayName": {"text": "喫茶コモン"},
                                "formattedAddress": "日本、東京都江東区白河1丁目", "rating": 4.2,
                                "userRatingCount": 9}]}

        stats = places.update_cafes(cafes, "secret", request_json=request)
        self.assertEqual(cafes[0]["googlePlaceId"], "new-id")
        self.assertEqual((stats["missing"], stats["changed"]), (1, 1))

    def test_sample_place_id_is_never_sent_to_details(self):
        cafes = [cafe(googlePlaceId="sample-placeholder")]
        calls = []

        def request(url, _key, _fields, **_kwargs):
            calls.append(url)
            return {"places": []}

        with redirect_stderr(io.StringIO()):
            stats = places.update_cafes(cafes, "secret", force=True, request_json=request)
        self.assertEqual(calls, [f"{places.API_ROOT}/places:searchText"])
        self.assertNotIn("sample-placeholder", calls[0])
        self.assertEqual(stats["missing"], 1)

    def test_unresolved_place_without_search_fields_makes_no_request(self):
        request = mock.Mock()
        with redirect_stderr(io.StringIO()):
            stats = places.update_cafes([cafe(name="", googlePlaceId="")], "secret",
                                        force=True, request_json=request)
        request.assert_not_called()
        self.assertEqual((stats["missing"], stats["failed"], stats["requests"]), (1, 1, 0))

    def test_fresh_entries_are_skipped_unless_forced(self):
        current = datetime(2026, 7, 29, tzinfo=timezone.utc)
        item = cafe(googlePlaceId="known", googleUpdatedAt="2026-07-10T00:00:00Z")
        request = mock.Mock(return_value={"id": "known"})
        with redirect_stdout(io.StringIO()):
            stats = places.update_cafes([item.copy()], "secret", now=current, request_json=request)
        request.assert_not_called()
        self.assertEqual(stats["fresh_skipped"], 1)

        places.update_cafes([item.copy()], "secret", now=current, force=True, request_json=request)
        request.assert_called_once()

    def test_invalid_or_old_timestamp_is_updated(self):
        current = datetime(2026, 7, 29, tzinfo=timezone.utc)
        for timestamp in (None, "not-a-date", "2026-01-01T00:00:00Z"):
            with self.subTest(timestamp=timestamp):
                request = mock.Mock(return_value={"id": "known"})
                places.update_cafes([cafe(googlePlaceId="known", googleUpdatedAt=timestamp)],
                                    "secret", now=current, request_json=request)
                request.assert_called_once()

    def test_request_limit_counts_retries_and_skips_remaining_cafes(self):
        calls = []

        def opener(request, timeout):
            self.assertEqual(timeout, 10)
            calls.append(request.full_url)
            raise urllib.error.HTTPError(request.full_url, 429, "limited", {}, None)

        def request(*args, **kwargs):
            return places._request_json(*args, **kwargs, opener=opener, sleeper=lambda _delay: None)

        output = io.StringIO()
        with redirect_stdout(output):
            stats = places.update_cafes([cafe(id="one", googlePlaceId="one"),
                                         cafe(id="two", googlePlaceId="two")],
                                        "secret", max_requests=2, request_json=request)
        self.assertEqual(len(calls), 2)
        self.assertEqual(stats["requests"], 2)
        self.assertEqual(stats["limit_skipped"], 2)
        self.assertIn("API request limit", output.getvalue())

    def test_unchanged_values_record_refresh_time_to_avoid_requery(self):
        original = cafe(googlePlaceId="known", googleRating=4.5, googleUserRatingsTotal=20,
                        googleUpdatedAt="2025-01-01T00:00:00.000Z")
        cafes = [original.copy()]
        current = datetime(2026, 7, 29, 12, 34, 56, tzinfo=timezone.utc)
        stats = places.update_cafes(
            cafes, "secret", now=current, request_json=lambda *_args, **_kwargs:
            {"id": "known", "rating": 4.5, "userRatingCount": 20}
        )
        self.assertEqual(cafes[0]["googleUpdatedAt"], "2026-07-29T12:34:56.000Z")
        self.assertEqual(stats["changed"], 1)

    def test_rate_limit_is_retried_with_bounded_backoff(self):
        attempts = []
        sleeps = []

        def opener(request, timeout):
            attempts.append((request, timeout))
            if len(attempts) < 3:
                raise urllib.error.HTTPError(request.full_url, 429, "limited", {}, None)
            return FakeResponse({"id": "known"})

        result = places._request_json("https://example.invalid", "secret", "id", opener=opener,
                                      sleeper=sleeps.append)
        self.assertEqual(result, {"id": "known"})
        self.assertEqual(len(attempts), 3)
        self.assertEqual(len(sleeps), 2)
        self.assertGreaterEqual(sleeps[1], sleeps[0])
        self.assertNotIn("secret", attempts[0][0].full_url)

    def test_corrupt_json_is_fatal_and_left_untouched(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cafes.json"
            path.write_text("{broken", encoding="utf-8")
            stderr = io.StringIO()
            with mock.patch.dict(os.environ, {"GOOGLE_MAPS_API_KEY": "secret"}), redirect_stderr(stderr):
                result = places.main(["--data", str(path)])
            self.assertEqual(result, 2)
            self.assertEqual(path.read_text(encoding="utf-8"), "{broken")
            self.assertNotIn("secret", stderr.getvalue())

    def test_main_does_not_rewrite_unchanged_json(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cafes.json"
            path.write_text(json.dumps([cafe(googlePlaceId="known")]) + "\n", encoding="utf-8")
            initial_mtime = path.stat().st_mtime_ns
            time.sleep(0.001)
            with mock.patch.dict(os.environ, {"GOOGLE_MAPS_API_KEY": "secret"}), \
                    mock.patch.object(places, "update_cafes", return_value={
                        "missing": 0, "success": 1, "failed": 0, "changed": 0,
                    }), mock.patch("sys.stdout", new=io.StringIO()):
                result = places.main(["--data", str(path)])
            self.assertEqual(result, 0)
            self.assertEqual(path.stat().st_mtime_ns, initial_mtime)

    def test_fail_on_error_does_not_write_partial_updates(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "cafes.json"
            original = json.dumps([cafe(googlePlaceId="known")]) + "\n"
            path.write_text(original, encoding="utf-8")
            stderr = io.StringIO()

            def partially_update(cafes, *_args, **_kwargs):
                cafes[0]["googleRating"] = 4.8
                return {"missing": 0, "success": 1, "failed": 1, "changed": 1}

            with mock.patch.dict(os.environ, {"GOOGLE_MAPS_API_KEY": "secret"}), \
                    mock.patch.object(places, "update_cafes", side_effect=partially_update), \
                    redirect_stderr(stderr):
                result = places.main(["--data", str(path), "--fail-on-error"])
            self.assertEqual(result, 2)
            self.assertEqual(path.read_text(encoding="utf-8"), original)
            self.assertIn("1 cafe update(s) failed", stderr.getvalue())


if __name__ == "__main__":
    unittest.main()
