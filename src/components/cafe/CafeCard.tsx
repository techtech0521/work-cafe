import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { FEATURE_LABELS } from "@/lib/cafe-labels";
import type { Cafe } from "@/types/cafe";
import { FavoriteButton } from "./FavoriteButton";

function value(value: number | null) {
  return value === null ? "未登録" : value.toFixed(1);
}

export function CafeCard({ cafe, selected = false, favorite = false, onSelect, onToggleFavorite }: { cafe: Cafe; selected?: boolean; favorite?: boolean; onSelect?: (id: string) => void; onToggleFavorite?: (id: string) => void }) {
  return (
    <article className={`cafe-card catalogue-card ${selected ? "selected" : ""}`} onMouseEnter={() => onSelect?.(cafe.id)} onFocus={() => onSelect?.(cafe.id)}>
      <FavoriteButton label={false} className="card-favorite-button" isFavorite={favorite} onToggle={() => onToggleFavorite?.(cafe.id)} />
      <Link className="cafe-card-main" href={`/cafes/${cafe.id}`} aria-current={selected ? "true" : undefined}>
        <div className="card-body">
          <p className="card-kicker"><MapPin size={13} />{cafe.area}</p>
          <h3>{cafe.name}</h3>
          <div className={`rating ${cafe.googleRating === null ? "rating-missing" : ""}`} aria-label="Googleでの評価">
            <Star size={14} fill={cafe.googleRating === null ? "none" : "currentColor"} />
            <b>{value(cafe.googleRating)}</b>
            <span>{cafe.googleUserRatingsTotal === null ? "（口コミ件数未登録）" : `（${cafe.googleUserRatingsTotal}件）`}</span>
          </div>
          <div className="tags">{cafe.features.map((feature) => <span key={feature}>{FEATURE_LABELS[feature]}</span>)}</div>
          <dl className="card-scores">
            <div><dt>作業のしやすさ</dt><dd>{value(cafe.workabilityScore)}</dd></div>
            <div><dt>コーヒー</dt><dd>{value(cafe.coffeeScore)}</dd></div>
            <div><dt>雰囲気</dt><dd>{value(cafe.atmosphereScore)}</dd></div>
          </dl>
        </div>
      </Link>
    </article>
  );
}
