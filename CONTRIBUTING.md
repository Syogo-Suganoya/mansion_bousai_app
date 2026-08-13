# 開発ガイド

ローカルでの開発環境のセットアップと、開発時のハマりどころをまとめる。

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
