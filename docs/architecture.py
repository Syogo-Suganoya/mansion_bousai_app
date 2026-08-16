"""マンション防災カルテ アーキテクチャ図の生成スクリプト。

技術名のみの構成図。処理フローの詳細は README とコードを参照。

実行:
    /Library/Developer/CommandLineTools/usr/bin/python3 docs/architecture.py

出力: docs/architecture.png（依存: diagrams, graphviz）
"""

from diagrams import Cluster, Diagram
from diagrams.generic.storage import Storage
from diagrams.onprem.client import Users
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.network import Internet
from diagrams.programming.framework import Nextjs
from diagrams.saas.cdn import Cloudflare

FONT = "Hiragino Sans"

graph_attr = {
    "fontname": FONT,
    "fontsize": "20",
    "labelloc": "t",
    "bgcolor": "white",
    "pad": "0.5",
    "nodesep": "0.8",
    "ranksep": "1.5",
    "splines": "spline",
}
node_attr = {"fontname": FONT, "fontsize": "13"}
edge_attr = {"fontname": FONT, "fontsize": "11"}
cluster_attr = {"fontname": FONT, "fontsize": "13", "style": "rounded", "penwidth": "1.6"}

with Diagram(
    "マンション防災カルテ — 技術スタック",
    filename="docs/architecture",
    outformat="png",
    show=False,
    direction="LR",
    graph_attr=graph_attr,
    node_attr=node_attr,
    edge_attr=edge_attr,
):
    user = Users("ブラウザ")

    with Cluster("Cloudflare Workers", graph_attr=cluster_attr):
        app = Nextjs("Next.js 16")

    with Cluster("オープンデータAPI", graph_attr=cluster_attr):
        gsi = Internet("国土地理院API")
        tokyo = Storage("東京都\nオープンデータAPI")

    hyperdrive = Cloudflare("Hyperdrive")
    neon = PostgreSQL("Neon\nPostgreSQL")

    user >> app
    app >> gsi
    app >> tokyo
    app >> hyperdrive >> neon
