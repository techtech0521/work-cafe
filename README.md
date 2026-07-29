# nomadly — Work Cafe Finder

仕事に適したカフェを、エリアや設備から探せる Next.js アプリケーションです。Next.js 16 の App Router、TypeScript、Tailwind CSS、React Leaflet を使用しています。

## 必要環境

- Node.js 22 以上（単体テストで組み込みの TypeScript 実行機能を使用します）
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

静的検証は `npm run typecheck`、`npm run lint`、`npm test`、`npm run validate:data` で個別に実行できます。

Pull Request と `main` ブランチへの push では、GitHub Actions が依存関係の固定インストール、JSON Schema によるカフェデータ検証、TypeScript 型チェック、Lint、単体テスト、Next.js 本番ビルド、ローカル本番サーバーのスモークチェックを実行します。この検証ジョブは Google API を呼ばず、Pull Request へ Secrets を渡しません。

## Vercel デプロイ

1. Vercel の **Add New > Project** からこの GitHub リポジトリを Import し、Framework Preset が **Next.js**、Production Branch が `main` であることを確認します。
2. **Settings > Git** の Production Branch と自動デプロイを有効にします。`main` への通常の push とカフェ更新ボットによる push のどちらも Vercel ビルドの対象とし、Ignored Build Step でボットのコミットを除外しないでください。
3. Vercel GitHub Integration が返す成功した `main` の deployment status を受けて、CI の `smoke-deployment` ジョブが公開 URL のトップページと最初のカフェ詳細ページを取得し、カフェデータが描画されたことを確認します。認証で保護された Preview ではなく、公開された Production Deployment を対象にします。

GitHub の `GITHUB_TOKEN` で行った push は別の Actions ワークフローを起動しないため、更新ワークフロー専用の fine-grained personal access token（対象リポジトリの **Contents: Read and write** のみ）を Actions Secret `CAFE_UPDATE_TOKEN` に登録します。更新ワークフローはこのトークンで commit を push するため、その commit でも `main` の CI と Vercel Git Integration の自動ビルドが起動します。この Secret は更新ジョブだけが参照し、Pull Request の CI には渡されません。

## カフェデータの更新

現在のカフェデータは `data/cafes.json` で管理し、形式は `data/cafes.schema.json` で定義しています。

1. 店名、エリア、営業時間、設備タグなどを追加または編集します。
2. `coordinates` に `[緯度, 経度]` の順で位置情報を設定します。
3. `npm run dev` で一覧・検索・地図マーカー・詳細表示を確認します。
4. `npm run build` を実行し、型エラーやビルドエラーがないことを確認します。

Google Places の評価・口コミ件数は、API キーをコマンドラインやファイルへ保存せず、環境変数から渡して更新できます。

```bash
GOOGLE_MAPS_API_KEY="..." python scripts/update_google_places.py
```

ローカルで環境変数ファイルを使う場合は、共有可能な `.env.example` をコピーして値を設定します。`.env` と `.env.*`（`.env.example` を除く）は Git の追跡対象外です。実際のキーを `.env.example` に記載しないでください。

```bash
cp .env.example .env
```

複数日に分ける場合は、日ごとに異なるゼロ始まりのインデックスを指定します。たとえば3分割の2番目だけを更新するには
`--shard-count 3 --shard-index 1` を使用します。Place ID が未登録の候補は店名と住所が十分一致した場合だけ自動登録され、曖昧な候補は標準エラーへ警告されます。

Leaflet を使用する地図本体は `src/components/map/LeafletMap.tsx` に分離し、`src/components/map/CafeMap.tsx` から `dynamic(..., { ssr: false })` で読み込んでいます。これにより、ブラウザ API を参照する Leaflet がサーバー上で評価されません。

## Google API キーと GitHub Actions の運用

### 初期設定

1. リポジトリの **Settings > Secrets and variables > Actions** で、Google API キーを Repository secret の `GOOGLE_MAPS_API_KEY` として登録します。キーをワークフロー、ソースコード、ログ、Issue へ直接記載しません。
2. Google Cloud で請求予算と予算アラートを設定し、API の利用量アラートも有効にします。想定する日次更新回数を基準に Places API のクォータ上限を設定し、費用やリクエスト数の急増を早期に検知できるようにします。
3. キーの **API restrictions** は、更新スクリプトが実際に使用する **Places API** だけに限定します。Custom Search API を実装で使用する場合に限り、その API も許可し、未使用の API は許可しません。
4. GitHub-hosted runner の送信元 IP アドレスは固定されないため、固定 IP による **Application restrictions** を更新ジョブの前提にしません。API 制限、クォータ、監視、および Actions Secret によってリスクを抑えます。

### Actions の最小権限

リポジトリの **Settings > Actions > General > Workflow permissions** は、可能な限り **Read repository contents permission** を既定にします。各ワークフローも原則 `contents: read` とし、カフェデータをコミットする更新ジョブだけにジョブ単位で `contents: write` を与えます。書き込み権限や Secret を、Pull Request 由来の任意コードを実行するジョブへ渡さないでください。

### ローテーション、監視、漏えい対応

- Google Cloud の利用状況と請求アラートを定期的に確認し、通常と異なる API、時間帯、リクエスト数、エラー率を調査します。
- キーは定期的にローテーションします。新しい制限済みキーを作成して Actions Secret を更新し、更新ジョブの成功を確認してから古いキーを失効させます。ローテーション日と担当者を運用記録に残します。
- キーの漏えいまたは異常利用を検知した場合は、調査完了を待たず Google Cloud で該当キーを直ちに無効化または削除します。その後、新しい制限済みキーを発行し、`GOOGLE_MAPS_API_KEY` を差し替え、利用ログと請求への影響を確認します。Git のファイルから文字列を削除するだけでは、漏えい対応は完了しません。

### コミット前と CI での漏えい検査

キーや `.env` をコミットしないことをコミット前に確認してください。CI は Gitleaks の CLI コンテナで現在のファイルだけでなくコミット履歴も検査するため、checkout の履歴を省略しません。検査でキーを検出した場合は、まず該当キーを**直ちに失効**させ、必要に応じて新しいキーへ交換します。その後に履歴から機密情報を除去し、CI が再び成功することを確認します。履歴の書き換えだけを失効の代わりにしてはいけません。

## 主なディレクトリ

```text
src/
├── app/          # App Router のレイアウト、ページ、グローバル CSS
├── components/   # 検索・一覧・詳細・地図 UI
└── data/         # カフェのサンプルデータ
```

## カフェ座標の登録方針

住所のジオコーディングはカフェの**初回登録時だけ**行い、確定した `latitude` / `longitude` を `data/cafes.json` に保存します。ページ表示時には外部のジオコーディング API を呼びません。座標を確定できない場合は両方を `null` にして一覧には残し、地図のマーカーからだけ除外します。
