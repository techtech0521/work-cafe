import type { Cafe, CafeFeature } from "../types/cafe";

export const CAFE_SORTS = ["google-rating", "review-count", "editorial", "newest"] as const;
export type CafeSort = (typeof CAFE_SORTS)[number];

export type CafeFilters = {
  query?: string;
  area?: string;
  features?: readonly CafeFeature[];
  sort?: CafeSort;
};

/** Fields are optional so imported/incomplete records can be handled safely. */
export type FilterableCafe = Partial<Cafe> & Pick<Cafe, "id">;

const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
const time = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? Date.parse(value) : Number.NEGATIVE_INFINITY;

/** Filters without mutating the source, then returns a deterministically sorted copy. */
export function filterCafes<T extends FilterableCafe>(cafes: readonly T[], filters: CafeFilters = {}): T[] {
  const query = filters.query?.trim().toLocaleLowerCase("ja") ?? "";
  const features = filters.features ?? [];
  const result = cafes.filter((cafe) => {
    const searchable = `${cafe.name ?? ""} ${cafe.address ?? ""}`.toLocaleLowerCase("ja");
    return (!query || searchable.includes(query)) &&
      (!filters.area || cafe.area === filters.area) &&
      features.every((feature) => cafe.features?.includes(feature));
  });

  const score = (cafe: T) => {
    switch (filters.sort) {
      case "review-count": return finite(cafe.googleUserRatingsTotal);
      case "editorial": return finite(cafe.workabilityScore);
      case "newest": return time(cafe.googleUpdatedAt);
      case "google-rating":
      default: return finite(cafe.googleRating);
    }
  };
  return result.sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id));
}
