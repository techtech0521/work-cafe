"use client";

import { useFavorites } from "@/hooks/use-favorites";
import { FavoriteButton } from "./FavoriteButton";

export function DetailFavoriteButton({ cafeId, validCafeIds }: { cafeId: string; validCafeIds: string[] }) {
  const { isFavorite, toggleFavorite } = useFavorites(validCafeIds);
  return <FavoriteButton className="detail-favorite-button" isFavorite={isFavorite(cafeId)} onToggle={() => toggleFavorite(cafeId)} />;
}
