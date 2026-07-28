import assert from "node:assert/strict";
import test from "node:test";
import { getMappedCafes } from "./cafe-coordinates.ts";
import type { Cafe } from "../types/cafe.ts";

const baseCafe = {
  id: "located", name: "Located cafe", address: "大阪市", area: "梅田",
  latitude: 34.6937, longitude: 135.5023, features: [], businessHours: null,
  googleMapsUrl: "https://maps.google.com", workabilityScore: null,
  coffeeScore: null, atmosphereScore: null, publishedAt: "2026-01-01",
  googlePlaceId: "place", googleRating: null, googleUserRatingsTotal: null,
  googleUpdatedAt: "2026-01-01T00:00:00.000Z",
} satisfies Cafe;

test("座標のないカフェは元の一覧を変更せずマップ対象からだけ除外する", () => {
  const cafes: Cafe[] = [baseCafe, { ...baseCafe, id: "not-geocoded", latitude: null, longitude: null }];
  assert.deepEqual(getMappedCafes(cafes).map(({ id }) => id), ["located"]);
  assert.equal(cafes.length, 2);
});

test("Leafletで扱えない範囲外の座標を除外する", () => {
  const cafes: Cafe[] = [
    { ...baseCafe, id: "bad-latitude", latitude: 91 },
    { ...baseCafe, id: "bad-longitude", longitude: -181 },
  ];
  assert.deepEqual(getMappedCafes(cafes), []);
});
