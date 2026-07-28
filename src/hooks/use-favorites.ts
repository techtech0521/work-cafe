"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FAVORITES_STORAGE_KEY,
  parseStoredFavorites,
  serializeFavorites,
} from "@/lib/favorites-storage";

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
      restored = parseStoredFavorites(
        window.localStorage.getItem(FAVORITES_STORAGE_KEY),
        validIds,
      );
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
    try {
      window.localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        serializeFavorites(favoriteIds),
      );
    } catch {
      // Keep the in-memory experience working when storage is full or blocked.
    }
  }, [favoriteIds, isLoaded]);

  useEffect(() => {
    const restoreFromAnotherTab = (event: StorageEvent) => {
      if (event.key !== FAVORITES_STORAGE_KEY) return;
      setFavoriteIds(parseStoredFavorites(event.newValue, validIds));
    };

    window.addEventListener("storage", restoreFromAnotherTab);
    return () => window.removeEventListener("storage", restoreFromAnotherTab);
  }, [validIds]);

  const favoriteIdSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);
  const isFavorite = useCallback((id: string) => favoriteIdSet.has(id), [favoriteIdSet]);
  const toggleFavorite = useCallback((id: string) => {
    if (!validIds.has(id)) return;
    setFavoriteIds((current) => current.includes(id) ? current.filter((favoriteId) => favoriteId !== id) : [...current, id]);
  }, [validIds]);

  return { favoriteIds, isFavorite, toggleFavorite, isLoaded };
}
