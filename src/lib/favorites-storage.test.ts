import assert from "node:assert/strict";
import test from "node:test";
import {
  FAVORITES_STORAGE_VERSION,
  parseStoredFavorites,
  serializeFavorites,
} from "./favorites-storage.ts";

const validIds = new Set(["cafe-a", "cafe-b"]);

test("バージョン付きJSONを読み書きする", () => {
  const serialized = serializeFavorites(["cafe-a", "cafe-b"]);

  assert.deepEqual(JSON.parse(serialized), {
    version: FAVORITES_STORAGE_VERSION,
    favoriteIds: ["cafe-a", "cafe-b"],
  });
  assert.deepEqual(parseStoredFavorites(serialized, validIds), ["cafe-a", "cafe-b"]);
});

test("壊れた値や未対応バージョンは空のお気に入りとして扱う", () => {
  assert.deepEqual(parseStoredFavorites("not-json", validIds), []);
  assert.deepEqual(parseStoredFavorites('{"version":2,"favoriteIds":["cafe-a"]}', validIds), []);
  assert.deepEqual(parseStoredFavorites('{"version":1,"favoriteIds":"cafe-a"}', validIds), []);
});

test("削除済みID、不正な値、重複を除去する", () => {
  const stored = JSON.stringify({
    version: FAVORITES_STORAGE_VERSION,
    favoriteIds: ["cafe-a", "deleted-cafe", 1, "cafe-a", "cafe-b"],
  });

  assert.deepEqual(parseStoredFavorites(stored, validIds), ["cafe-a", "cafe-b"]);
});
