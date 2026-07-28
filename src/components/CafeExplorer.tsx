"use client";

import { useEffect, useMemo, useState } from "react";
import { Coffee, Heart, Map, MapPin, Menu, Sparkles, X } from "lucide-react";
import { getCafes } from "@/lib/cafes";
import { CAFE_SORTS, filterCafes, type CafeSort } from "@/lib/filter-cafes";
import { CAFE_FEATURES } from "@/types/cafe";
import type { CafeFeature } from "@/types/cafe";
import { CafeMap } from "./map/CafeMap";
import { CafeCard } from "./cafe/CafeCard";
import { AreaSelect, OSAKA_AREAS } from "./search/AreaSelect";
import { FeatureTagSelect } from "./search/FeatureTagSelect";
import { SearchForm } from "./search/SearchForm";
import { SortSelect } from "./search/SortSelect";

const cafes = getCafes();

export function CafeExplorer() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState("");
  const [features, setFeatures] = useState<CafeFeature[]>([]);
  const [sort, setSort] = useState<CafeSort>("google-rating");
  const [urlReady, setUrlReady] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedCafeId, setSelectedCafeId] = useState<string>();
  const filtered = useMemo(() => filterCafes(cafes, { query, area, features, sort }), [query, area, features, sort]);
  const hasFilters = Boolean(query || area || features.length || sort !== "google-rating");
  const clearFilters = () => { setQuery(""); setArea(""); setFeatures([]); setSort("google-rating"); };

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const restoredArea = params.get("area") ?? "";
    const restoredTags = (params.get("tags") ?? "").split(",").filter((tag): tag is CafeFeature => (CAFE_FEATURES as readonly string[]).includes(tag));
    const restoredSort = params.get("sort") ?? "";
    queueMicrotask(() => {
      if (cancelled) return;
      setQuery(params.get("q") ?? "");
      setArea((OSAKA_AREAS as readonly string[]).includes(restoredArea) ? restoredArea : "");
      setFeatures(restoredTags);
      setSort((CAFE_SORTS as readonly string[]).includes(restoredSort) ? restoredSort as CafeSort : "google-rating");
      setUrlReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (area) params.set("area", area);
    if (features.length) params.set("tags", features.join(","));
    if (sort !== "google-rating") params.set("sort", sort);
    const search = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`);
  }, [query, area, features, sort, urlReady]);

  useEffect(() => {
    if (!mapOpen) return;

    const closeOverlay = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setMapOpen(false);
    };

    document.addEventListener("keydown", closeOverlay);
    return () => document.removeEventListener("keydown", closeOverlay);
  }, [mapOpen]);

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
          <SearchForm value={query} onChange={setQuery} />
        </section>

        <section className="results-section">
          <div className="results-heading"><div><p>WORK FRIENDLY CAFÉS</p><h2>大阪のワークカフェ</h2><span>大阪エリアから厳選した、集中できる場所</span></div></div>
          <div className="filter-panel"><AreaSelect value={area} onChange={setArea} /><FeatureTagSelect value={features} onChange={setFeatures} /><SortSelect value={sort} onChange={setSort} />{hasFilters && <button className="clear-button" type="button" onClick={clearFilters}>条件をすべて解除</button>}</div>
          <div className="content-grid">
            <div className="list-panel">
              <div className="list-meta"><b>{filtered.length}件</b>のカフェが見つかりました <button onClick={() => setMapOpen(!mapOpen)}><Map size={15} /> 地図で見る</button></div>
              <div className="cards">
                {filtered.map((cafe) => <CafeCard key={cafe.id} cafe={cafe} selected={selectedCafeId === cafe.id} onSelect={setSelectedCafeId} />)}
                {!filtered.length && <div className="empty"><Coffee /><h3>検索結果がありません</h3><p>別のエリアや条件で検索してみてください。</p>{hasFilters && <button className="clear-button" onClick={clearFilters}>条件を解除する</button>}</div>}
              </div>
            </div>
            <aside className={`map-panel ${mapOpen ? "mobile-visible" : ""}`}><button className="map-close" onClick={() => setMapOpen(false)} aria-label="地図を閉じる"><X /></button><CafeMap cafes={filtered} selectedCafeId={selectedCafeId} onSelectCafe={setSelectedCafeId} /><div className="map-caption"><MapPin size={15} /> 検索結果を地図に表示</div></aside>
          </div>
        </section>
      </main>

      <footer><a className="brand" href="#"><span><Coffee size={18} /></span>nomadly</a><p>Find your place. Do your best work.</p><small>© 2026 nomadly</small></footer>
    </div>
  );
}
