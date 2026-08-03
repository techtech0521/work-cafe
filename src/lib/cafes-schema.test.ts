import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const Ajv = require("ajv");
const schema = JSON.parse(readFileSync("data/cafes.schema.json", "utf8"));
const base = JSON.parse(readFileSync("data/cafes.json", "utf8"))[0];
const validate = new Ajv({ allErrors: true }).compile(schema);

test("googleMapsUrl only accepts Google Maps HTTPS URLs", () => {
  for (const url of [
    "https://www.google.com/maps/search/?api=1&query=cafe",
    "https://google.com/maps/place/cafe",
  ]) {
    assert.equal(validate([{ ...base, googleMapsUrl: url }]), true, JSON.stringify(validate.errors));
  }

  for (const url of [
    "https://evil.example/maps/cafe",
    "https://www.google.com.evil.example/maps/cafe",
    "https://www.google.com/search?q=cafe",
    "http://www.google.com/maps/cafe",
  ]) {
    assert.equal(validate([{ ...base, googleMapsUrl: url }]), false, url);
  }
});

test("Google fields may be null before the first Places sync", () => {
  assert.equal(
    validate([{
      ...base,
      googlePlaceId: null,
      googleRating: null,
      googleUserRatingsTotal: null,
      googleUpdatedAt: null,
    }]),
    true,
    JSON.stringify(validate.errors),
  );
});
