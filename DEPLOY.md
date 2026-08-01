# デプロイ手順書 — Neon + Cloudflare Workers

このアプリを本番公開するための手順。構成は以下の通り。

| 役割 | サービス | 費用 |
| :--- | :--- | :--- |
| アプリ本体 (Next.js SSR + API) | Cloudflare Workers（`@opennextjs/cloudflare` アダプタ） | 無料枠内（1日10万リクエストまで無料） |
| DB (PostgreSQL) | Neon 無料枠 | 無料（ストレージ0.5GB） |
| DBへの接続 | Cloudflare Hyperdrive | 無料枠内 |

> **なぜこの構成か**: Cloudflare WorkersはNode.jsの`net`によるTCP接続を直接は張れないため、
> `pg`（node-postgres）はそのままでは動かない。**Hyperdrive** がWorkers–Postgres間の接続を
> プロキシ・プーリングしてくれるため、アプリ側のコード（`pg`のクエリ発行部分）は変更不要。
> ローカル開発（`npm run dev` / Docker Postgres）にも影響しない。

このリポジトリには既に以下が設定済み：
- `@opennextjs/cloudflare` / `wrangler`（devDependencies）
- [`wrangler.jsonc`](wrangler.jsonc)（Workerの設定。`hyperdrive` バインディングのプレースホルダ入り）
- [`open-next.config.ts`](open-next.config.ts)（Cloudflareアダプタの設定）
- [`lib/db.ts`](lib/db.ts)（Workers上では`env.HYPERDRIVE`、ローカルでは`DATABASE_URL`を自動で使い分け）
- `package.json` の `cf:preview` / `cf:deploy` スクリプト

---

## 手順1: Neon でDBを作る（約5分）

1. https://neon.tech を開き、**Sign up** → Googleアカウントでサインアップ
2. プロジェクト作成画面で以下を入力して **Create project**
   - Project name: `mansion-bousai`（任意）
   - Postgres version: そのまま（16以上）
   - Region: **Asia Pacific (Singapore)** など、いちばん近いリージョン
3. 作成直後のダッシュボードに **Connection string** が表示される。
   **「Pooled connection」のチェックを外した**、直接接続の文字列をコピーする
   （`postgresql://ユーザー名:パスワード@ep-xxxx.ap-xxxx.aws.neon.tech/neondb?sslmode=require` の形式。
   Hyperdrive自身がコネクションプーリングを行うため、Neon側のPoolerは経由しない方が安定する）

## 手順2: スキーマとシードデータを投入（約3分）

1. Neon のダッシュボード左メニューから **SQL Editor** を開く
2. このリポジトリの [`db/init/01_schema.sql`](db/init/01_schema.sql) の中身を全部コピーして貼り付け、**Run** を実行
3. 左メニューの **Tables** で `risk_areas`（30行）と `posts` ができていれば成功

## 手順3: Cloudflareアカウントの準備とログイン（約5分）

1. https://dash.cloudflare.com でアカウントを作成（未作成の場合）
2. ローカルでCLIにログインする

   ```bash
   npx wrangler login
   ```

   ブラウザが開くので、Cloudflareアカウントで認可する

## 手順4: Hyperdrive を作成する（約5分）

Neonの接続文字列をCloudflareに登録し、Hyperdriveの設定を作る。

```bash
npx wrangler hyperdrive create mansion-bousai \
  --connection-string="postgresql://ユーザー名:パスワード@ep-xxxx.ap-xxxx.aws.neon.tech/neondb?sslmode=require"
```

実行すると `id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"` が出力される。この値を
[`wrangler.jsonc`](wrangler.jsonc) の `hyperdrive[0].id` の `<HYPERDRIVE_ID>` と
置き換える。

```jsonc
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "ここにコマンド出力のidを貼る",
    "localConnectionString": "postgres://bousai:bousai@localhost:5433/bousai"
  }
]
```

> `localConnectionString` はローカルの `wrangler dev` 実行時にDocker PostgresへHyperdrive経由で
> 繋ぐための設定。**本番のNeon接続文字列とは別物**なので変更不要。

> **複数のCloudflareアカウントに所属している場合**: Hyperdriveはアカウント単位のリソースなので、
> 作成前に `wrangler.jsonc` の `account_id` を目的のアカウントに設定しておく
> （設定済み: `tokyo_odh_039`）。アカウント一覧は `npx wrangler whoami` で確認できる。
> 誤ったアカウントに作ってしまった場合は、そのアカウントにNeonの認証情報が残るため
> `npx wrangler hyperdrive delete <id>` で削除しておく。

## 手順5: ローカルでビルド・動作確認（約5分）

デプロイ前に、Cloudflare Workers環境を模したローカルプレビューで確認する。

```bash
# Docker PostgresがまだならDBを起動
docker compose up -d

# Cloudflare向けにビルド
npm run cf:preview
```

- ビルド後に開くURL（デフォルト `http://localhost:8788` 付近）で `/board` を開き、
  投稿→マッチング状況に反映されればHyperdrive経由のDB接続もOK
- `wrangler dev` 単体で確認したい場合は `npx wrangler dev` でも同様に動作確認できる

## 手順6: デプロイ

```bash
npm run cf:deploy
```

初回はCloudflareアカウント・プロジェクトの確認を求められる場合がある。
完了すると `https://mansion-bousai.<あなたのサブドメイン>.workers.dev` のURLが発行される。

動作確認チェックリスト:
- [ ] `/` — ランディングページが画像付きで表示される
- [ ] `/karte` — 「墨田区京島2丁目」で判定 → 実データバッジ・危険度5・避難所が出る
- [ ] `/board` — 投稿ができて、マッチング状況に反映される（←これがDB接続の確認）

## 手順7: GitHub Actionsで自動デプロイにする（約10分）

`main` へのpushで自動的にビルド・デプロイされるようにする。ワークフローは
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) に用意済み。
**手順6の手動デプロイを一度成功させてから**行う。

> Cloudflare公式の **Workers Builds**（ダッシュボードでGitHubリポジトリを直結する方式）は、
> 接続の作成にアカウント**管理者**権限が必要。`tokyo_odh_039` のようにメンバー権限しか
> 持たないアカウントでは使えないため、GitHub Actions方式を採用している。

1. **APIトークンを作る**

   Cloudflareダッシュボード右上のアイコン → **My Profile** → **API Tokens** →
   **Create Token** → **Create Custom Token**。Account Resources に `tokyo_odh_039` を指定し、
   権限は以下だけを付与する。

   | 種別 | 権限 |
   | :--- | :--- |
   | Account | Workers Scripts : Edit |
   | Account | Hyperdrive : Read |

   > テンプレートの **Edit Cloudflare Workers** は使わない。`Account Settings : Read` を含んでおり、
   > メンバーロールによっては
   > `Failed common permission check against resources. (Permission group: "Account Settings Read")`
   > で作成できない。この権限はwranglerがアカウント一覧を引くためのもので、
   > `wrangler.jsonc` に `account_id` を明記している本リポジトリでは不要。
   >
   > 同じ理由で `Hyperdrive : Read` も付与できない場合は、`Workers Scripts : Edit` のみで試す。
   > 作成できる権限の上限は自分のメンバーロールに従うため、それも通らない場合は
   > アカウント管理者にロール変更を依頼する。

2. **GitHub Secretsに登録**

   リポジトリ → Settings → Secrets and variables → Actions → **New repository secret**
   - Name: `CLOUDFLARE_API_TOKEN`
   - Secret: 手順1で発行したトークン

3. **pushする**

   ```bash
   git push origin main
   ```

   GitHubの **Actions** タブでワークフローの実行結果を確認する。
   以降は `main` へのpushのたびに自動デプロイされる（Actionsタブから手動実行も可能）。

   ワークフローには `environment: production` を設定してあるため、実行のたびに
   GitHubの **Deployments（Environments）** に履歴と公開URLが記録される。
   リポジトリトップに表示するには、リポジトリの **Edit repository details** →
   *Include in the home page* の **Deployments** にチェックを入れる。

> **Hyperdriveのバインディング**: `wrangler.jsonc` の `account_id` と `hyperdrive[0].id` は
> コミット済みのため、CI側で環境変数を追加する必要はない。DBの認証情報はHyperdriveが
> 保持しているので、リポジトリにもGitHub Secretsにも接続文字列を置かずに済む。

---

## トラブルシューティング

| 症状 | 対処 |
| :--- | :--- |
| GitHub Actionsのデプロイが `Authentication error` で落ちる | `CLOUDFLARE_API_TOKEN` がSecretsに登録されているか、トークンの対象アカウントが `tokyo_odh_039` になっているかを確認 |
| デプロイ時に Hyperdrive のバインディングでエラー | APIトークンに `Hyperdrive : Read` を追加する |
| `npm run cf:preview` / `cf:deploy` で `Could not resolve "pg-cloudflare"` | `pg-cloudflare` が依存関係に入っているか確認（`package.json`）。`next.config.ts` の `serverExternalPackages: ["pg", "pg-cloudflare"]` が外れていないか確認 |
| `/board` や `/karte` の判定でエラー | Hyperdriveの`id`が`wrangler.jsonc`に正しく設定されているか確認。Neonの接続文字列がプールなし（直接接続）になっているか確認 |
| ローカルの`wrangler dev`だけDB接続できない | Dockerの`docker compose up -d`でPostgresが起動しているか確認。`wrangler.jsonc`の`localConnectionString`のポート（5433）が`docker-compose.yml`と一致しているか確認 |
| 判定が「データ未登録」になる | DBではなく東京都オープンデータAPI側の問題。時間をおいて再試行 |

## 費用の目安

- **Neon**: 無料枠（0.5GB / 自動サスペンドあり）で十分。カード登録不要
- **Cloudflare Workers**: 無料枠（1日10万リクエストまで）で十分。カード登録不要
- **Hyperdrive**: 無料枠内（リクエスト数に応じた課金だが、このアプリの規模なら通常は0円）
