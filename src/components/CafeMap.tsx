"use client";

import dynamic from "next/dynamic";
import type { Cafe } from "@/types/cafe";

const Map = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => <div className="map-loading">地図を読み込んでいます…</div>,
});

export function CafeMap({ cafes }: { cafes: readonly Cafe[] }) {
  return <Map cafes={cafes} />;
}
