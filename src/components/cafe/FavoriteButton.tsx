"use client";

import { Heart } from "lucide-react";

export function FavoriteButton({ isFavorite, onToggle, label = true, className = "favorite-button" }: { isFavorite: boolean; onToggle: () => void; label?: boolean; className?: string }) {
  const action = isFavorite ? "お気に入りから削除" : "お気に入りに追加";
  return <button type="button" className={`${className} ${isFavorite ? "active" : ""}`} aria-label={action} aria-pressed={isFavorite} onClick={onToggle}>
    <Heart size={17} fill={isFavorite ? "currentColor" : "none"} />
    {label && <span>{isFavorite ? "お気に入り済み" : "お気に入りに追加"}</span>}
  </button>;
}
