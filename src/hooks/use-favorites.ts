"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "nomadly:favorites";
const STORAGE_VERSION = 1;

type StoredFavorites = { version: typeof STORAGE_VERSION; favoriteIds: string[] };

function readFavoriteIds(value: string | null, validIds: ReadonlySet<string>): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== "object" || parsed === null || !("version" in parsed) || parsed.version !== STORAGE_VERSION || !("favoriteIds" in parsed) || !Array.isArray(parsed.favoriteIds)) return [];
    return [...new Set(parsed.favoriteIds.filter((id): id is string => typeof id === "string" && validIds.has(id)))];
  } catch {
    return [];
  }
}

/** Client-only favorite state, persisted as a versioned localStorage payload. */
export function useFavorites(validCafeIds: readonly string[]) {
  const validIds = useMemo(() => new Set(validCafeIds), [validCafeIds]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Reading after mount keeps the server render and first client render identical.
    let cancelled = false;
    let restored: string[] = [];
    try {
      restored = readFavoriteIds(window.localStorage.getItem(STORAGE_KEY), validIds);
    } catch {
      // Privacy modes and storage policies may make localStorage unavailable.
    }
    queueMicrotask(() => {
      if (cancelled) return;
      setFavoriteIds(restored);
      setIsLoaded(true);
    });
    return () => { cancelled = true; };
  }, [validIds]);

  useEffect(() => {
    if (!isLoaded) return;
    const payload: StoredFavorites = { version: STORAGE_VERSION, favoriteIds };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Keep the in-memory experience working when storage is full or blocked.
    }
  }, [favoriteIds, isLoaded]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isFavorite = useCallback((id: string) => favoriteIdSet.has(id), [favoriteIdSet]);
  const toggleFavorite = useCallback((id: string) => {
    if (!validIds.has(id)) return;
    setFavoriteIds((current) => current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id]);
  }, [validIds]);

  return { favoriteIds, isFavorite, toggleFavorite, isLoaded };
}
