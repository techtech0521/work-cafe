export const OSAKA_AREAS = ["梅田", "難波", "心斎橋", "天王寺", "中之島"] as const;

export function AreaSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="filter-field"><span>エリア</span><select value={value} onChange={(event) => onChange(event.target.value)}>
    <option value="">大阪すべて</option>
    {OSAKA_AREAS.map((area) => <option value={area} key={area}>{area}</option>)}
  </select></label>;
}
