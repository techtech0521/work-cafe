import Link from "next/link";
import { ExternalLink, MapPin, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { CafeMap } from "@/components/map/CafeMap";
import { FEATURE_LABELS } from "@/lib/cafe-labels";
import { getCafeById, getCafes } from "@/lib/cafes";
import type { BusinessHours, DayOfWeek } from "@/types/cafe";
import { DetailFavoriteButton } from "@/components/cafe/DetailFavoriteButton";

const DAYS: Array<[DayOfWeek, string]> = [
  ["monday", "月"], ["tuesday", "火"], ["wednesday", "水"],
  ["thursday", "木"], ["friday", "金"], ["saturday", "土"], ["sunday", "日"],
];

const displayScore = (score: number | null) => score === null ? "未登録" : `${score.toFixed(1)} / 5`;

function Hours({ hours }: { hours: BusinessHours | null }) {
  if (!hours) return <p className="missing-value">営業時間・定休日は未登録です</p>;
  return <>
    <dl className="hours-list">{DAYS.map(([day, label]) => {
      const value = hours.weekly[day];
      return <div key={day}><dt>{label}曜日</dt><dd>{value.open && value.close ? `${value.open}〜${value.close}` : "休業"}</dd></div>;
    })}</dl>
    <p className="closed-days"><b>定休日：</b>{hours.regularClosedDays.length ? hours.regularClosedDays.join("、") : "なし（登録情報上）"}</p>
  </>;
}

export function generateStaticParams() {
  return getCafes().map(({ id }) => ({ id }));
}

export default async function CafeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cafe = getCafeById(id);
  if (!cafe) notFound();

  return <main className="cafe-detail-page">
    <div className="detail-nav"><Link href="/">← カフェ一覧へ戻る</Link></div>
    <header className="detail-hero">
      <p className="card-kicker"><MapPin size={15} />{cafe.area}</p>
      <h1>{cafe.name}</h1>
      <p>{cafe.address}</p>
      <DetailFavoriteButton cafeId={cafe.id} validCafeIds={getCafes().map(({ id }) => id)} />
      <div className={`rating ${cafe.googleRating === null ? "rating-missing" : ""}`}><Star size={17} fill={cafe.googleRating === null ? "none" : "currentColor"} /><b>{displayScore(cafe.googleRating)}</b><span>{cafe.googleUserRatingsTotal === null ? "口コミ件数未登録" : `${cafe.googleUserRatingsTotal}件の口コミ`}</span></div>
    </header>

    <div className="detail-layout">
      <div className="detail-info">
        <section><h2>特徴</h2><div className="tags detail-tags">{cafe.features.map((feature) => <span key={feature}>{FEATURE_LABELS[feature]}</span>)}</div></section>
        <section><h2>nomadly 評価</h2><dl className="score-grid"><div><dt>作業のしやすさ</dt><dd>{displayScore(cafe.workabilityScore)}</dd></div><div><dt>コーヒー</dt><dd>{displayScore(cafe.coffeeScore)}</dd></div><div><dt>雰囲気</dt><dd>{displayScore(cafe.atmosphereScore)}</dd></div></dl></section>
        <section><h2>営業時間・定休日</h2><Hours hours={cafe.businessHours} /></section>
        <section><h2>住所</h2><p>{cafe.address}</p><a className="primary-wide map-link" href={cafe.googleMapsUrl} target="_blank" rel="noopener noreferrer">Google Mapsで開く <ExternalLink size={15} /></a></section>
      </div>
      <aside className="detail-map" aria-label={`${cafe.name}の地図`}><CafeMap cafes={[cafe]} /></aside>
    </div>
  </main>;
}
