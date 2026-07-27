"use client";

import dynamic from "next/dynamic";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="map-loading">地図を読み込んでいます…</div>,
});

export function CafeMap() {
  return <Map />;
}
