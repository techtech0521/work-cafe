import cafeData from "../../data/cafes.json";
import type { Cafe, GoogleCafeUpdate } from "@/types/cafe";

const cafes = cafeData as Cafe[];

/** Returns the curated cafe catalogue as typed data. */
export function getCafes(): readonly Cafe[] {
  return cafes;
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

