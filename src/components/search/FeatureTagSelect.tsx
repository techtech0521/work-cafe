import type { CafeFeature } from "@/types/cafe";

export const FEATURE_LABELS: Record<CafeFeature, string> = {
  wifi: "Wi-Fi", "power-outlets": "電源", quiet: "静か", "long-stay-friendly": "長居OK",
  "open-late": "夜カフェ", spacious: "広々", "scenic-view": "絶景",
};

export function FeatureTagSelect({ value, onChange }: { value: readonly CafeFeature[]; onChange: (value: CafeFeature[]) => void }) {
  const toggle = (feature: CafeFeature) => onChange(value.includes(feature) ? value.filter((item) => item !== feature) : [...value, feature]);
  return <fieldset className="tag-picker"><legend>特徴</legend><div>{Object.entries(FEATURE_LABELS).map(([feature, label]) => {
    const active = value.includes(feature as CafeFeature);
    return <button type="button" aria-pressed={active} className={active ? "active" : ""} onClick={() => toggle(feature as CafeFeature)} key={feature}>{label}</button>;
  })}</div></fieldset>;
}
