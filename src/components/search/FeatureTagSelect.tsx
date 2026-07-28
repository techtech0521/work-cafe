import type { CafeFeature } from "@/types/cafe";
import { FEATURE_LABELS } from "@/lib/cafe-labels";

export function FeatureTagSelect({ value, onChange }: { value: readonly CafeFeature[]; onChange: (value: CafeFeature[]) => void }) {
  const toggle = (feature: CafeFeature) => onChange(value.includes(feature) ? value.filter((item) => item !== feature) : [...value, feature]);
  return <fieldset className="tag-picker"><legend>特徴</legend><div>{Object.entries(FEATURE_LABELS).map(([feature, label]) => {
    const active = value.includes(feature as CafeFeature);
    return <button type="button" aria-pressed={active} className={active ? "active" : ""} onClick={() => toggle(feature as CafeFeature)} key={feature}>{label}</button>;
  })}</div></fieldset>;
}
