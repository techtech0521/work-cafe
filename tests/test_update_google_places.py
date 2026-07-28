import io
import json
import os
import tempfile
import unittest
import urllib.error
from contextlib import redirect_stderr
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

    def test_unchanged_values_do_not_modify_data(self):
        original = cafe(googlePlaceId="known", googleRating=4.5, googleUserRatingsTotal=20,
                        googleUpdatedAt="2025-01-01T00:00:00.000Z")
        cafes = [original.copy()]
        stats = places.update_cafes(
            cafes, "secret", request_json=lambda *_args, **_kwargs:
            {"id": "known", "rating": 4.5, "userRatingCount": 20}
        )
        self.assertEqual(cafes[0], original)
        self.assertEqual(stats["changed"], 0)

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


if __name__ == "__main__":
    unittest.main()
