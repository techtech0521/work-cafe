export const FAVORITES_STORAGE_KEY = "nomadly:favorites";
export const FAVORITES_STORAGE_VERSION = 1;

export type StoredFavorites = {
  version: typeof FAVORITES_STORAGE_VERSION;
  favoriteIds: string[];
};

/** Parses persisted favorites and drops malformed, duplicate, and unknown IDs. */
export function parseStoredFavorites(
  value: string | null,
  validIds: ReadonlySet<string>,
): string[] {
  if (!value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("version" in parsed) ||
      parsed.version !== FAVORITES_STORAGE_VERSION ||
      !("favoriteIds" in parsed) ||
      !Array.isArray(parsed.favoriteIds)
    ) {
      return [];
    }

    return [...new Set(parsed.favoriteIds.filter(
      (id): id is string => typeof id === "string" && validIds.has(id),
    ))];
  } catch {
    return [];
  }
}

export function serializeFavorites(favoriteIds: readonly string[]): string {
  const payload: StoredFavorites = {
    version: FAVORITES_STORAGE_VERSION,
    favoriteIds: [...favoriteIds],
  };
  return JSON.stringify(payload);
}
