# nomadly — Work Cafe Finder

仕事に適したカフェを、エリアや設備から探せる Next.js アプリケーションです。Next.js 16 の App Router、TypeScript、Tailwind CSS、React Leaflet を使用しています。

## 必要環境

- Node.js 20.9 以上
- npm 10.x

## ローカル開発

```bash
npm install
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開きます。開発サーバーではファイルの変更が自動的に反映されます。

依存関係は Next.js と `eslint-config-next` を同じバージョンに固定し、React 19 に対応した React Leaflet 5 を使用しています。依存解決を再現可能にするため、初回の `npm install` 後に生成される `package-lock.json` もコミットしてください。

## ビルドと本番起動

```bash
npm run build
npm start
```

静的解析は `npm run lint` で実行できます。

Pull Request と `main` ブランチへの push では、GitHub Actions が `npm install`、静的解析、本番ビルドを順番に実行します。ローカルのネットワーク制限により npm registry に接続できない場合も、CI の結果から依存解決とビルド可否を確認できます。

## カフェデータの更新

現在のサンプルデータは `src/data/cafes.ts` の `cafes` 配列で管理しています。

1. 店名、エリア、営業時間、設備タグなどを追加または編集します。
2. `coordinates` に `[緯度, 経度]` の順で位置情報を設定します。
3. `npm run dev` で一覧・検索・地図マーカー・詳細表示を確認します。
4. `npm run build` を実行し、型エラーやビルドエラーがないことを確認します。

Google Places の評価・口コミ件数は、API キーをコマンドラインやファイルへ保存せず、環境変数から渡して更新できます。

```bash
GOOGLE_MAPS_API_KEY="..." python scripts/update_google_places.py
```

複数日に分ける場合は、日ごとに異なるゼロ始まりのインデックスを指定します。たとえば3分割の2番目だけを更新するには
`--shard-count 3 --shard-index 1` を使用します。Place ID が未登録の候補は店名と住所が十分一致した場合だけ自動登録され、曖昧な候補は標準エラーへ警告されます。

Leaflet を使用する地図本体は `src/components/map/LeafletMap.tsx` に分離し、`src/components/map/CafeMap.tsx` から `dynamic(..., { ssr: false })` で読み込んでいます。これにより、ブラウザ API を参照する Leaflet がサーバー上で評価されません。

## 主なディレクトリ

```text
src/
├── app/          # App Router のレイアウト、ページ、グローバル CSS
├── components/   # 検索・一覧・詳細・地図 UI
└── data/         # カフェのサンプルデータ
```

## カフェ座標の登録方針

住所のジオコーディングはカフェの**初回登録時だけ**行い、確定した `latitude` / `longitude` を `data/cafes.json` に保存します。ページ表示時には外部のジオコーディング API を呼びません。座標を確定できない場合は両方を `null` にして一覧には残し、地図のマーカーからだけ除外します。
