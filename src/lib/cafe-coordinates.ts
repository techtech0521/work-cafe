import type { Cafe } from "@/types/cafe";

export type LocatedCafe = Cafe & { latitude: number; longitude: number };

/** Returns true only for coordinates Leaflet can place on the world map. */
export function hasCoordinates(cafe: Cafe): cafe is LocatedCafe {
  return typeof cafe.latitude === "number" &&
    Number.isFinite(cafe.latitude) &&
    cafe.latitude >= -90 &&
    cafe.latitude <= 90 &&
    typeof cafe.longitude === "number" &&
    Number.isFinite(cafe.longitude) &&
    cafe.longitude >= -180 &&
    cafe.longitude <= 180;
}

/** Does not mutate the catalogue, so unlocated cafes remain in the list. */
export function getMappedCafes(cafes: readonly Cafe[]): LocatedCafe[] {
  return cafes.filter(hasCoordinates);
}
