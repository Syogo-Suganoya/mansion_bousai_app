"""マンション防災カルテ アーキテクチャ図の生成スクリプト。

実行:
    /Library/Developer/CommandLineTools/usr/bin/python3 docs/architecture.py

出力: docs/architecture.png（依存: diagrams, graphviz）
"""

from diagrams import Cluster, Diagram, Edge
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.container import Docker
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.network import Internet
from diagrams.programming.framework import Nextjs, React
from diagrams.programming.language import TypeScript
from diagrams.saas.cdn import Cloudflare

FONT = "Hiragino Sans"

graph_attr = {
    "fontname": FONT,
    "fontsize": "20",
    "labelloc": "t",
    "bgcolor": "white",
    "pad": "0.6",
    "nodesep": "0.5",
    "ranksep": "1.1",
    "splines": "spline",
}
node_attr = {"fontname": FONT, "fontsize": "11"}
edge_attr = {"fontname": FONT, "fontsize": "10"}
cluster_attr = {"fontname": FONT, "fontsize": "13", "style": "rounded", "penwidth": "1.6"}

with Diagram(
    "マンション防災カルテ — システムアーキテクチャ",
    filename="docs/architecture",
    outformat="png",
    show=False,
    direction="LR",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr,
):
    user = Users("マンション住民 /\n避難所運営者\n(ブラウザ)")

    with Cluster("Cloudflare Workers  (@opennextjs/cloudflare)", graph_attr=cluster_attr):
        with Cluster("Next.js 16 App Router — 画面 (Client Components)", graph_attr=cluster_attr):
            page_top = Nextjs("/\nランディング")
            page_karte = React("/karte\n防災カルテ")
            page_board = React("/board\nデジタル目安箱")

        with Cluster("Route Handlers (API)", graph_attr=cluster_attr):
            api_risk = TypeScript("GET /api/risk\n住所→危険度判定")
            api_posts = TypeScript("GET/POST /api/posts\n需給投稿・集計")

        with Cluster("lib/", graph_attr=cluster_attr):
            lib_tokyo = TypeScript("tokyoApi.ts\n都APIクライアント\n+ 6hインメモリキャッシュ")
            lib_risk = TypeScript("risk.ts\n区・カテゴリ定義\n危険度評価")
            lib_sim = TypeScript("simulator.ts\n在宅避難日数\nシミュレーション")
            lib_db = TypeScript("db.ts\npg Pool\n(Hyperdrive/DATABASE_URL)")

    with Cluster("国土地理院API（APIキー不要）", graph_attr=cluster_attr):
        gsi = Internet("ジオコーディング /\n逆ジオコーディング\nmsearch・mreversegeocoder")

    with Cluster(
        "東京都オープンデータAPI（APIキー不要）\nservice.api.metro.tokyo.lg.jp",
        graph_attr=cluster_attr,
    ):
        api_kiken = Storage("地域危険度測定調査\n(第9回・都市整備局)")
        api_shinsui = Storage("浸水予想区域図\n(建設局・10流域)")
        api_shobo = Storage("消火栓・防火水槽等\n(東京消防庁)")
        api_hinan = Storage("避難所一覧\n(総務局 CC BY 4.0)")

    with Cluster("データストア", graph_attr=cluster_attr):
        hyperdrive = Cloudflare("Hyperdrive\n(TCPプロキシ / プーリング)")
        neon = PostgreSQL("Neon PostgreSQL 16\nposts / risk_areas")
        local_db = Docker("ローカル開発\nDocker Postgres :5433")

    # クライアント → 画面
    user >> Edge(label="HTTPS") >> page_top
    user >> Edge(label="HTTPS") >> page_karte
    user >> Edge(label="HTTPS") >> page_board

    # 画面 → API
    page_karte >> Edge(label="住所を送信") >> api_risk
    page_board >> Edge(label="投稿 / 10秒ポーリング") >> api_posts

    # 画面内ロジック（サーバー往復なし）
    page_karte >> Edge(style="dashed", label="備蓄量から算出") >> lib_sim

    # API → lib
    api_risk >> lib_tokyo
    api_risk >> Edge(style="dashed", label="フォールバック照会") >> lib_db
    api_risk >> Edge(style="dashed") >> lib_risk
    api_posts >> lib_db
    api_posts >> Edge(style="dashed", label="入力バリデーション") >> lib_risk

    # 外部API呼び出し
    api_risk >> Edge(label="① 住所→緯度経度→町丁目") >> gsi
    lib_tokyo >> Edge(label="② 区+町丁目で照会") >> api_kiken
    lib_tokyo >> Edge(label="③ 周辺150m の最大浸水深") >> api_shinsui
    lib_tokyo >> Edge(label="④ 周辺300m の件数") >> api_shobo
    lib_tokyo >> Edge(label="⑤ 区内を距離順にソート") >> api_hinan

    # DB接続
    lib_db >> Edge(label="本番: env.HYPERDRIVE") >> hyperdrive >> Edge(label="pg over TCP") >> neon
    lib_db >> Edge(style="dashed", label="ローカル: DATABASE_URL") >> local_db
