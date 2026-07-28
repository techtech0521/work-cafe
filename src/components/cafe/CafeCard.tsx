import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import type { Cafe, CafeFeature } from "@/types/cafe";

export const FEATURE_LABELS: Record<CafeFeature, string> = {
  wifi: "Wi-Fi",
  "power-outlets": "電源あり",
  quiet: "静か",
  "long-stay-friendly": "長居しやすい",
  "open-late": "夜まで営業",
  spacious: "広々",
  "scenic-view": "景色が良い",
};

function value(value: number | null) {
  return value === null ? "未登録" : value.toFixed(1);
}

export function CafeCard({ cafe }: { cafe: Cafe }) {
  return (
    <article className="cafe-card catalogue-card">
      <Link className="cafe-card-main" href={`/cafes/${cafe.id}`}>
        <div className="card-body">
          <p className="card-kicker"><MapPin size={13} />{cafe.area}</p>
          <h3>{cafe.name}</h3>
          <div className="rating" aria-label="Googleでの評価">
            <Star size={14} fill="currentColor" />
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
