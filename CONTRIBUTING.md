# 開発ガイド

ローカルでの開発環境のセットアップと、開発時のハマりどころをまとめる。
デプロイ手順は [`DEPLOY.md`](DEPLOY.md) を参照。

## 開発環境の起動

```bash
# 1. DB起動（初回起動時に db/init/01_schema.sql が自動投入される）
docker compose up -d

# 2. 開発サーバー起動
npm install
npm run dev
```

http://localhost:3000 で表示（`.env.local` の `DATABASE_URL` でDB接続先を変更可能。
未設定時は `postgres://bousai:bousai@localhost:5433/bousai` に接続する）。

## DB操作

- **リセット**: `docker compose down -v && docker compose up -d`（ボリュームごと削除してスキーマ再投入）
- スキーマとシードデータは [`db/init/01_schema.sql`](db/init/01_schema.sql) にまとまっている

## 既知の制約・ハマりどころ

- パスに日本語を含むディレクトリ対策として `next.config.ts` で `turbopack.root` を固定している（外すとTurbopackがパニックする）
- スタイルやコードの変更が反映されない場合はTurbopackのFSキャッシュが原因の可能性があるため、`rm -rf .next` してからdevサーバーを再起動する
  - 特に**Tailwindの新しいユーティリティクラスを使ったのに効かない**ときはほぼこれ

## ランディングページのスクリーンショット差し替え

`/`（ランディングページ）の操作手順に載せているスクリーンショットは `public/guide/` の
`step1-status.png` 〜 `step6-match.png`。UIを変更したら撮り直して差し替える。

- 撮影対象: STEP 1〜4 は `/karte` の各セクション、STEP 5〜6 は `/board` の投稿フォームとマッチング状況
- Playwrightのelement screenshot（`locator("main section")` の各要素、viewport幅960px・deviceScaleFactor 2）で
  撮影すると既存と同じ見た目になる
- 画像は `app/page.tsx` で静的インポートしているため、ファイル名を変えた場合はimport文も更新する
