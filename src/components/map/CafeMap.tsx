"use client";

import dynamic from "next/dynamic";
import type { Cafe } from "@/types/cafe";

export type CafeMapProps = {
  cafes: readonly Cafe[];
  selectedCafeId?: string;
  onSelectCafe?: (id: string) => void;
};

const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => <div className="map-loading">地図を読み込んでいます…</div>,
});

/** Client-only boundary keeps Leaflet's browser APIs out of server rendering. */
export function CafeMap(props: CafeMapProps) {
  return <LeafletMap {...props} />;
}
