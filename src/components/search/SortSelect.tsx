import type { CafeSort } from "@/lib/filter-cafes";

export function SortSelect({ value, onChange }: { value: CafeSort; onChange: (value: CafeSort) => void }) {
  return <label className="filter-field"><span>並び替え</span><select value={value} onChange={(event) => onChange(event.target.value as CafeSort)}>
    <option value="google-rating">Google評価順</option><option value="review-count">口コミ件数順</option>
    <option value="editorial">独自評価順</option><option value="newest">新着順</option>
  </select></label>;
}
