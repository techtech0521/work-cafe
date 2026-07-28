import { Search, X } from "lucide-react";

export function SearchForm({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <form className="search-box" role="search" onSubmit={(event) => event.preventDefault()}>
    <Search size={20} />
    <input value={value} onChange={(event) => onChange(event.target.value)} placeholder="店名・住所から検索" aria-label="店名・住所から検索" />
    {value && <button type="button" onClick={() => onChange("")} aria-label="検索語をクリア"><X size={18} /></button>}
    <button className="search-button" type="submit">検索する</button>
  </form>;
}
