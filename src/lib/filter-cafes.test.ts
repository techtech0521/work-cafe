import assert from "node:assert/strict";
import test from "node:test";
import { filterCafes, type FilterableCafe } from "./filter-cafes.ts";

const cafes: FilterableCafe[] = [
  { id: "a", name: "Alpha Coffee", address: "大阪市北区梅田", area: "梅田", features: ["wifi", "quiet"], googleRating: 4.5, googleUserRatingsTotal: 100, workabilityScore: 4.1, publishedAt: "2026-01-01" },
  { id: "b", name: "Beta Cafe", address: "大阪市中央区", area: "心斎橋", features: ["wifi", "power-outlets"], googleRating: 4.5, googleUserRatingsTotal: 101, workabilityScore: 4.9, publishedAt: "2026-02-01" },
  { id: "missing", name: "未評価店", address: "大阪市北区梅田", area: "梅田" },
];

test("空条件は全件を返し、評価の同値境界ではIDで安定化する", () => {
  const originalOrder = cafes.map(({ id }) => id);
  assert.deepEqual(filterCafes(cafes).map(({ id }) => id), ["a", "b", "missing"]);
  assert.deepEqual(cafes.map(({ id }) => id), originalOrder);
  assert.equal(filterCafes([]).length, 0);
});

test("店名と住所のキーワードを空白除去・大文字小文字無視で検索する", () => {
  assert.deepEqual(filterCafes(cafes, { query: "  ALPHA " }).map(({ id }) => id), ["a"]);
  assert.deepEqual(filterCafes(cafes, { query: "中央区" }).map(({ id }) => id), ["b"]);
});

test("エリアと複数タグはAND条件で組み合わせる", () => {
  assert.deepEqual(filterCafes(cafes, { area: "梅田", features: ["wifi", "quiet"] }).map(({ id }) => id), ["a"]);
  assert.deepEqual(filterCafes(cafes, { features: ["wifi", "scenic-view"] }), []);
});

test("4種の並び替えと欠損値を安全に扱う", () => {
  assert.deepEqual(filterCafes(cafes, { sort: "review-count" }).map(({ id }) => id), ["b", "a", "missing"]);
  assert.deepEqual(filterCafes(cafes, { sort: "editorial" }).map(({ id }) => id), ["b", "a", "missing"]);
  assert.deepEqual(filterCafes(cafes, { sort: "newest" }).map(({ id }) => id), ["b", "a", "missing"]);
  assert.doesNotThrow(() => filterCafes([{ id: "only-missing" }], { query: "x", features: ["wifi"] }));
});
