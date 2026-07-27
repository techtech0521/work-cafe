"use client";

import { useEffect, useMemo, useState } from "react";
import { BatteryCharging, ChevronLeft, Clock3, Coffee, Heart, Map, MapPin, Menu, Search, SlidersHorizontal, Sparkles, Star, Wifi, X } from "lucide-react";
import { getCafes } from "@/lib/cafes";
import type { Cafe, CafeFeature } from "@/types/cafe";
import { CafeMap } from "./CafeMap";

const cafes = getCafes();
const featureLabels: Record<CafeFeature, string> = {
  wifi: "Wi-Fi",
  "power-outlets": "電源あり",
  quiet: "静か",
  "long-stay-friendly": "長居OK",
  "open-late": "夜まで営業",
  spacious: "開放的",
};

function hoursSummary(cafe: Cafe) {
  const hours = cafe.businessHours.weekly.monday;
  return hours.open && hours.close ? `${hours.open}–${hours.close}` : "定休日";
}

function CafeCard({ cafe, selected, onSelect }: { cafe: Cafe; selected: boolean; onSelect: () => void }) {
  return (
    <article className={`cafe-card ${selected ? "selected" : ""}`}>
      <button className="cafe-card-main" type="button" onClick={onSelect} aria-label={`${cafe.name}の詳細を見る`}>
        <div className="cafe-photo" style={{ background: "linear-gradient(145deg, #647d62, #f4ede2)" }}>
          <Coffee size={40} strokeWidth={1.2} />
        </div>
        <div className="card-body">
          <div className="card-kicker"><MapPin size={13} /> {cafe.area}</div>
          <h3>{cafe.name}</h3>
          <div className="rating"><Star size={14} fill="currentColor" /> <b>{cafe.googleRating}</b><span>（{cafe.googleUserRatingsTotal}件）</span></div>
          <div className="tags">{cafe.features.map((feature) => <span key={feature}>{featureLabels[feature]}</span>)}</div>
        </div>
      </button>
      <button className="heart" type="button" aria-label={`${cafe.name}をお気に入りに追加`}><Heart size={18} /></button>
    </article>
  );
}

export function CafeExplorer() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Cafe | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const filtered = useMemo(() => cafes.filter((cafe) => `${cafe.name}${cafe.area}${cafe.address}${cafe.features.join("")}`.toLowerCase().includes(query.toLowerCase())), [query]);

  useEffect(() => {
    if (!selected && !mapOpen) return;

    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setSelected(null);
      setMapOpen(false);
    };

    document.addEventListener("keydown", closeOverlay);
    return () => document.removeEventListener("keydown", closeOverlay);
  }, [selected, mapOpen]);

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#"><span><Coffee size={18} /></span>nomadly</a>
        <nav><a href="#discover">カフェを探す</a><a href="#guide">使い方</a><a href="#about">nomadlyについて</a></nav>
        <div className="header-actions"><button className="ghost-button"><Heart size={17} /> お気に入り</button><button className="menu-button" aria-label="メニュー"><Menu /></button></div>
      </header>

      <main>
        <section className="hero" id="discover">
          <div className="eyebrow"><Sparkles size={14} /> YOUR NEXT WORKSPACE</div>
          <h1>仕事がはかどる、<br /><em>お気に入りの場所</em>を。</h1>
          <p>電源、Wi-Fi、居心地のよさ。<br className="mobile-only" />あなたの働き方に合うカフェを見つけよう。</p>
          <form className="search-box" role="search" onSubmit={(event) => event.preventDefault()}>
            <Search size={20} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="駅名・エリア・カフェ名で検索" aria-label="カフェを検索" />
            {query && <button type="button" onClick={() => setQuery("")} aria-label="検索をクリア"><X size={18} /></button>}
            <button className="search-button" type="submit">検索する</button>
          </form>
          <div className="quick-filters"><span>人気の条件</span><button><BatteryCharging size={14} /> 電源あり</button><button><Wifi size={14} /> 高速Wi-Fi</button><button><Clock3 size={14} /> 朝から営業</button></div>
        </section>

        <section className="results-section">
          <div className="results-heading"><div><p>WORK FRIENDLY CAFÉS</p><h2>おすすめのワークカフェ</h2><span>東京エリアから厳選した、集中できる場所</span></div><button className="filter-button"><SlidersHorizontal size={16} /> 条件を絞り込む</button></div>
          <div className="content-grid">
            <div className="list-panel">
              <div className="list-meta"><b>{filtered.length}件</b>のカフェが見つかりました <button onClick={() => setMapOpen(!mapOpen)}><Map size={15} /> 地図で見る</button></div>
              <div className="cards">
                {filtered.map((cafe) => <CafeCard key={cafe.id} cafe={cafe} selected={selected?.id === cafe.id} onSelect={() => setSelected(cafe)} />)}
                {!filtered.length && <div className="empty"><Coffee /><h3>該当するカフェがありません</h3><p>別のエリアや条件で検索してみてください。</p></div>}
              </div>
            </div>
            <aside className={`map-panel ${mapOpen ? "mobile-visible" : ""}`}><button className="map-close" onClick={() => setMapOpen(false)} aria-label="地図を閉じる"><X /></button><CafeMap /><div className="map-caption"><MapPin size={15} /> 表示エリアを移動して検索</div></aside>
          </div>
        </section>
      </main>

      {selected && <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={`${selected.name}の詳細`}>
        <button className="detail-back" onClick={() => setSelected(null)}><ChevronLeft /> 一覧へ戻る</button>
        <div className="detail-visual" style={{ background: "linear-gradient(135deg, #647d62, #efe4d4)" }}><Coffee size={72} strokeWidth={1} /></div>
        <div className="detail-content"><p className="card-kicker"><MapPin size={14} /> {selected.address}</p><h2>{selected.name}</h2><div className="rating"><Star size={16} fill="currentColor" /><b>{selected.googleRating}</b><span>（{selected.googleUserRatingsTotal}件のレビュー）</span></div><p className="description">落ち着いた空間とおいしいコーヒー。自然光が入る店内で、集中したい日のワークスペースにぴったりです。</p><div className="detail-stats"><div><Wifi /><span>Wi-Fi</span><b>高速・無料</b></div><div><BatteryCharging /><span>電源</span><b>利用可能</b></div><div><Clock3 /><span>営業時間</span><b>{hoursSummary(selected)}</b></div></div><a className="primary-wide" href={selected.googleMapsUrl} target="_blank" rel="noreferrer">このカフェへの行き方を見る</a></div>
      </div>}
      <footer><a className="brand" href="#"><span><Coffee size={18} /></span>nomadly</a><p>Find your place. Do your best work.</p><small>© 2026 nomadly</small></footer>
    </div>
  );
}
