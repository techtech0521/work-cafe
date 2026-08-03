export const CAFE_FEATURES = [
  "wifi",
  "power-outlets",
  "quiet",
  "long-stay-friendly",
  "open-late",
  "spacious",
  "scenic-view",
] as const;

export type CafeFeature = (typeof CAFE_FEATURES)[number];

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type DailyBusinessHours = {
  /** `null` means that the cafe is closed for the whole day. */
  open: string | null;
  close: string | null;
};

export type BusinessHours = {
  weekly: Record<DayOfWeek, DailyBusinessHours>;
  /** Human-readable rules for regular holidays, such as "第2火曜日". */
  regularClosedDays: string[];
};

/** Values researched and maintained by the editorial team. */
export type EditorialCafeData = {
  workabilityScore: number | null;
  coffeeScore: number | null;
  atmosphereScore: number | null;
  /** Date the cafe was first published in this catalogue (YYYY-MM-DD). */
  publishedAt: string;
};

/** Values sourced from Google and safe for the Google sync job to replace. */
export type GoogleCafeData = {
  /** `null` until the first successful Google Places match. */
  googlePlaceId: string | null;
  googleRating: number | null;
  googleUserRatingsTotal: number | null;
  /** `null` until Google-owned fields have been refreshed. */
  googleUpdatedAt: string | null;
};

export type Cafe = {
  /** Stable application-owned identifier. It must not be replaced by an external ID. */
  id: string;
  name: string;
  address: string;
  area: string;
  /** Persisted coordinates. `null` means that geocoding has not been completed. */
  latitude: number | null;
  longitude: number | null;
  features: CafeFeature[];
  businessHours: BusinessHours | null;
  googleMapsUrl: string;
} & EditorialCafeData &
  GoogleCafeData;

/** Restricts an automated Google update to Google-owned fields only. */
export type GoogleCafeUpdate = Pick<Cafe, keyof GoogleCafeData>;
