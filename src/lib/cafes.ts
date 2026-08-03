import cafeData from "../../data/cafes.json";
import { CAFE_FEATURES } from "@/types/cafe";
import type {
  BusinessHours,
  Cafe,
  CafeFeature,
  DayOfWeek,
  GoogleCafeUpdate,
} from "@/types/cafe";

const DAYS: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCafeFeature(value: unknown): value is CafeFeature {
  return (
    typeof value === "string" &&
    (CAFE_FEATURES as readonly string[]).includes(value)
  );
}

function isBusinessHours(value: unknown): value is BusinessHours {
  if (!isRecord(value) || !isRecord(value.weekly)) return false;
  const weekly = value.weekly;
  if (
    !Array.isArray(value.regularClosedDays) ||
    !value.regularClosedDays.every((day) => typeof day === "string")
  ) {
    return false;
  }

  return DAYS.every((day) => {
    const hours = weekly[day];
    return (
      isRecord(hours) &&
      (typeof hours.open === "string" || hours.open === null) &&
      (typeof hours.close === "string" || hours.close === null) &&
      ((hours.open === null && hours.close === null) ||
        (typeof hours.open === "string" && typeof hours.close === "string"))
    );
  });
}

function isCafe(value: unknown): value is Cafe {
  if (!isRecord(value)) return false;

  const stringFields = [
    "id",
    "name",
    "address",
    "area",
    "googleMapsUrl",
    "publishedAt",
  ] as const;
  const nullableCoordinateFields = [
    "latitude",
    "longitude",
  ] as const;
  const nullableNumberFields = [
    "workabilityScore", "coffeeScore", "atmosphereScore",
    "googleRating", "googleUserRatingsTotal",
  ] as const;
  const nullableStringFields = ["googlePlaceId", "googleUpdatedAt"] as const;

  return (
    stringFields.every((field) => {
      const fieldValue = value[field];
      return typeof fieldValue === "string" && fieldValue.length > 0;
    }) &&
    nullableStringFields.every((field) => {
      const fieldValue = value[field];
      return fieldValue === null ||
        (typeof fieldValue === "string" && fieldValue.length > 0);
    }) &&
    nullableCoordinateFields.every((field) => {
      const fieldValue = value[field];
      return fieldValue === null ||
        (typeof fieldValue === "number" && Number.isFinite(fieldValue));
    }) &&
    nullableNumberFields.every((field) => {
      const fieldValue = value[field];
      return fieldValue === null ||
        (typeof fieldValue === "number" && Number.isFinite(fieldValue));
    }) &&
    Array.isArray(value.features) &&
    value.features.every(isCafeFeature) &&
    (value.businessHours === null || isBusinessHours(value.businessHours))
  );
}

function parseCafes(value: unknown): Cafe[] {
  if (!Array.isArray(value)) {
    throw new Error("Cafe data must be an array");
  }

  return value.map((cafe, index) => {
    if (!isCafe(cafe)) {
      throw new Error(`Invalid cafe data at index ${index}`);
    }
    return cafe;
  });
}

const cafes = parseCafes(cafeData);

/** Returns the curated cafe catalogue as typed data. */
export function getCafes(): readonly Cafe[] {
  return cafes;
}

/** Returns one cafe by its stable application-owned identifier. */
export function getCafeById(id: string): Cafe | undefined {
  return cafes.find((cafe) => cafe.id === id);
}

/**
 * Applies data from Google without accepting editorial scores in the payload.
 * Sync code should use this boundary instead of spreading API data onto a cafe.
 */
export function applyGoogleCafeUpdate(
  cafe: Cafe,
  update: GoogleCafeUpdate,
): Cafe {
  return { ...cafe, ...update };
}
