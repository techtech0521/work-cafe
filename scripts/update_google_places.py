#!/usr/bin/env python3
"""Update cached Google Places ratings without exposing API credentials."""

from __future__ import annotations

import argparse
import json
import os
import random
import re
import sys
import tempfile
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any, Callable

API_ROOT = "https://places.googleapis.com/v1"
DETAIL_FIELDS = "id,rating,userRatingCount"
SEARCH_FIELDS = "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount"


class ApiError(RuntimeError):
    pass


class RequestLimitReached(ApiError):
    """Raised before a network call would exceed the execution budget."""


class RequestBudget:
    def __init__(self, maximum: int):
        if maximum < 0:
            raise ValueError("max_requests must not be negative")
        self.maximum = maximum
        self.used = 0

    def consume(self) -> None:
        if self.used >= self.maximum:
            raise RequestLimitReached(f"API request limit ({self.maximum}) reached")
        self.used += 1


def _request_json(
    url: str,
    api_key: str,
    fields: str,
    *,
    body: dict[str, Any] | None = None,
    attempts: int = 4,
    timeout: float = 10,
    opener: Callable[..., Any] | None = None,
    sleeper: Callable[[float], None] | None = None,
    on_request: Callable[[], None] | None = None,
) -> dict[str, Any]:
    if attempts < 1:
        raise ValueError("attempts must be positive")
    # Resolve these at call time so tests and callers can safely patch stdlib I/O.
    opener = opener or urllib.request.urlopen
    sleeper = sleeper or time.sleep
    data = None if body is None else json.dumps(body).encode("utf-8")
    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": fields,
        "Accept": "application/json",
    }
    if data is not None:
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=data, headers=headers, method="POST" if data else "GET")
    for attempt in range(attempts):
        if on_request:
            on_request()
        try:
            with opener(request, timeout=timeout) as response:
                result = json.load(response)
            if not isinstance(result, dict):
                raise ApiError("API returned an invalid JSON object")
            return result
        except urllib.error.HTTPError as error:
            retryable = error.code == 429 or 500 <= error.code < 600
            error.close()
            if not retryable or attempt + 1 == attempts:
                raise ApiError(f"Google Places request failed with HTTP {error.code}") from None
        except (TimeoutError, urllib.error.URLError) as error:
            timed_out = isinstance(error, TimeoutError) or isinstance(getattr(error, "reason", None), TimeoutError)
            if not timed_out or attempt + 1 == attempts:
                message = "timed out" if timed_out else "failed due to a network error"
                raise ApiError(f"Google Places request {message}") from None
        sleeper((2**attempt) + random.uniform(0, 0.25))
    raise AssertionError("unreachable")


def _normalized(value: str) -> str:
    value = unicodedata.normalize("NFKC", value).casefold()
    return re.sub(r"[^0-9a-z\u3040-\u30ff\u3400-\u9fff]", "", value)


def _candidate_matches(cafe: dict[str, Any], candidate: dict[str, Any]) -> bool:
    display = candidate.get("displayName")
    candidate_name = display.get("text") if isinstance(display, dict) else display
    if not isinstance(candidate_name, str) or not isinstance(candidate.get("formattedAddress"), str):
        return False
    name, found_name = _normalized(str(cafe.get("name", ""))), _normalized(candidate_name)
    address, found_address = _normalized(str(cafe.get("address", ""))), _normalized(candidate["formattedAddress"])
    if not all((name, found_name, address, found_address)):
        return False
    name_score = SequenceMatcher(None, name, found_name).ratio()
    address_score = SequenceMatcher(None, address, found_address).ratio()
    name_contained = min(len(name), len(found_name)) >= 5 and (name in found_name or found_name in name)
    address_contained = min(len(address), len(found_address)) >= 8 and (address in found_address or found_address in address)
    return (name_score >= 0.78 or name_contained) and (address_score >= 0.65 or address_contained)


def _validate_place(place: dict[str, Any]) -> None:
    if not isinstance(place.get("id"), str) or not place["id"]:
        raise ApiError("API response did not contain a valid Place ID")
    rating = place.get("rating")
    count = place.get("userRatingCount")
    if rating is not None and (isinstance(rating, bool) or not isinstance(rating, (int, float)) or not 0 <= rating <= 5):
        raise ApiError("API response contained an invalid rating")
    if count is not None and (isinstance(count, bool) or not isinstance(count, int) or count < 0):
        raise ApiError("API response contained an invalid rating count")


def _apply(cafe: dict[str, Any], place: dict[str, Any], *, new_id: bool, updated_at: datetime) -> bool:
    _validate_place(place)
    updates: dict[str, Any] = {}
    if new_id:
        updates["googlePlaceId"] = place["id"]
    if "rating" in place:
        updates["googleRating"] = place["rating"]
    if "userRatingCount" in place:
        updates["googleUserRatingsTotal"] = place["userRatingCount"]
    timestamp = updated_at.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")
    updates["googleUpdatedAt"] = timestamp
    changed = any(cafe.get(key) != value for key, value in updates.items())
    if changed:
        cafe.update(updates)
    return changed


def update_cafes(
    cafes: list[dict[str, Any]], api_key: str, *, shard_count: int = 1, shard_index: int = 0,
    refresh_days: int = 30, force: bool = False, max_requests: int = 50,
    now: datetime | None = None,
    request_json: Callable[..., dict[str, Any]] = _request_json,
) -> dict[str, int]:
    if shard_count < 1 or not 0 <= shard_index < shard_count:
        raise ValueError("invalid round-robin shard")
    if refresh_days < 0:
        raise ValueError("refresh_days must not be negative")
    budget = RequestBudget(max_requests)
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        raise ValueError("now must be timezone-aware")
    stats = {"missing": sum(not _valid_place_id(cafe.get("googlePlaceId")) for cafe in cafes),
             "success": 0, "failed": 0, "changed": 0, "fresh_skipped": 0,
             "limit_skipped": 0, "requests": 0}
    for index, cafe in enumerate(cafes):
        if index % shard_count != shard_index:
            continue
        label = str(cafe.get("id") or cafe.get("name") or f"index {index}")
        if not force and _is_fresh(cafe.get("googleUpdatedAt"), now, refresh_days):
            stats["fresh_skipped"] += 1
            print(f"skip: {label}: updated within {refresh_days} days")
            continue
        if budget.used >= budget.maximum:
            stats["limit_skipped"] += 1
            print(f"skip: {label}: API request limit ({budget.maximum}) reached")
            continue
        try:
            place_id = cafe.get("googlePlaceId")
            request = lambda *args, **kwargs: request_json(*args, **kwargs, on_request=budget.consume)
            if _valid_place_id(place_id):
                encoded_id = urllib.parse.quote(str(place_id), safe="")
                place = request(f"{API_ROOT}/places/{encoded_id}", api_key, DETAIL_FIELDS)
                if place.get("id") != place_id:
                    raise ApiError("Place Details response ID did not match the requested Place ID")
                is_new = False
            else:
                if not _searchable(cafe):
                    raise ApiError("Place ID is not set and name/address are insufficient for search")
                response = request(
                    f"{API_ROOT}/places:searchText", api_key, SEARCH_FIELDS,
                    body={"textQuery": f"{cafe.get('name', '')} {cafe.get('address', '')}", "languageCode": "ja", "maxResultCount": 5},
                )
                candidates = response.get("places", [])
                if not isinstance(candidates, list):
                    raise ApiError("search response did not contain a valid candidate list")
                matches = [item for item in candidates if isinstance(item, dict) and _candidate_matches(cafe, item)]
                if len(matches) != 1:
                    raise ApiError("no unambiguous matching candidate; Place ID was not saved")
                place, is_new = matches[0], True
            # A successful refresh is useful even when rating values are unchanged:
            # recording it prevents the same cafe from being queried again next run.
            stats["changed"] += int(_apply(cafe, place, new_id=is_new, updated_at=now))
            stats["success"] += 1
        except RequestLimitReached as error:
            stats["limit_skipped"] += 1
            print(f"skip: {label}: {error}")
        except (ApiError, ValueError, TypeError) as error:
            stats["failed"] += 1
            print(f"warning: {label}: {error}", file=sys.stderr)
    stats["requests"] = budget.used
    return stats


def _valid_place_id(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip()) and not value.strip().casefold().startswith("sample-")


def _searchable(cafe: dict[str, Any]) -> bool:
    return all(isinstance(cafe.get(field), str) and cafe[field].strip() for field in ("name", "address"))


def _is_fresh(value: Any, now: datetime, refresh_days: int) -> bool:
    if not isinstance(value, str):
        return False
    try:
        updated = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if updated.tzinfo is None:
            return False
        return now - timedelta(days=refresh_days) <= updated <= now
    except ValueError:
        return False


def _read(path: Path) -> list[dict[str, Any]]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise RuntimeError(f"cannot read valid cafe JSON from {path}: {error}") from None
    if not isinstance(value, list) or not all(isinstance(item, dict) for item in value):
        raise RuntimeError(f"{path} must contain an array of objects")
    return value


def _atomic_write(path: Path, cafes: list[dict[str, Any]]) -> None:
    content = json.dumps(cafes, ensure_ascii=False, indent=2) + "\n"
    temporary: str | None = None
    try:
        with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, prefix=f".{path.name}.", delete=False) as output:
            temporary = output.name
            output.write(content)
            output.flush()
            os.fsync(output.fileno())
        # Validate the bytes actually written, rather than only the in-memory value.
        with open(temporary, encoding="utf-8") as candidate:
            if json.load(candidate) != cafes:
                raise RuntimeError("temporary cafe JSON failed validation")
        os.chmod(temporary, path.stat().st_mode)
        os.replace(temporary, path)
    finally:
        if temporary and os.path.exists(temporary):
            os.unlink(temporary)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("data/cafes.json"))
    parser.add_argument("--shard-count", type=int, default=1, help="number of round-robin groups")
    parser.add_argument("--shard-index", type=int, default=0, help="zero-based group to update")
    parser.add_argument("--refresh-days", type=int, default=30, help="skip entries updated within this many days")
    parser.add_argument("--force", action="store_true", help="ignore googleUpdatedAt freshness")
    parser.add_argument("--max-requests", type=int, default=50, help="maximum API attempts, including retries")
    parser.add_argument(
        "--fail-on-error", action="store_true",
        help="fail without writing the data file if any cafe could not be updated",
    )
    args = parser.parse_args(argv)
    if args.shard_count < 1 or not 0 <= args.shard_index < args.shard_count:
        parser.error("--shard-count must be positive and --shard-index must be in its range")
    if args.refresh_days < 0 or args.max_requests < 0:
        parser.error("--refresh-days and --max-requests must not be negative")
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY")
    if not api_key:
        print("fatal: GOOGLE_MAPS_API_KEY is not set", file=sys.stderr)
        return 2
    try:
        cafes = _read(args.data)
        before = json.dumps(cafes, ensure_ascii=False, separators=(",", ":"))
        stats = update_cafes(cafes, api_key, shard_count=args.shard_count, shard_index=args.shard_index,
                             refresh_days=args.refresh_days, force=args.force, max_requests=args.max_requests)
        if args.fail_on_error and stats["failed"]:
            raise RuntimeError(f"{stats['failed']} cafe update(s) failed; data was not written")
        if before != json.dumps(cafes, ensure_ascii=False, separators=(",", ":")):
            _atomic_write(args.data, cafes)
    except (RuntimeError, OSError, ValueError) as error:
        print(f"fatal: {error}", file=sys.stderr)
        return 2
    print(f"Place ID未登録数: {stats['missing']} / 成功数: {stats['success']} / 失敗数: {stats['failed']} / "
          f"変更数: {stats['changed']} / 新規データスキップ数: {stats.get('fresh_skipped', 0)} / "
          f"上限スキップ数: {stats.get('limit_skipped', 0)} / APIリクエスト数: {stats.get('requests', 0)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
