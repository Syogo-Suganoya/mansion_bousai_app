import type { Metadata } from "next";
import "./globals.css";
import { NavTabs } from "./components/NavTabs";

export const metadata: Metadata = {
  title: "マンション防災カルテ",
  description:
    "東京都オープンデータを活用したマンション防災・避難所マッチングシステム",
};

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@500;700&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&family=DotGothic16&display=swap";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FONT_HREF} />
      </head>
      <body className="min-h-full flex flex-col">
        <header className="border-b border-(--color-paper-deep) bg-(--color-ink) text-(--color-paper)">
          <div className="mx-auto max-w-4xl px-4 pt-4">
            <p className="font-display text-2xl tracking-wide">防災カルテ</p>
            <p className="font-mono text-[0.65rem] text-(--color-paper-deep) mb-3">
              MANSION BOUSAI KARTE — 東京都オープンデータ連携
            </p>
          </div>
          <NavTabs />
        </header>
        <main className="flex-1 mx-auto w-full max-w-4xl px-4 py-8">
          {children}
        </main>
        <footer className="border-t border-(--color-paper-deep) text-center font-mono text-[0.65rem] text-(--color-ink-soft) py-4 px-4">
          データ出典: 東京都オープンデータAPI（都市整備局「地域危険度測定調査」/ 建設局「浸水予想区域図」/
          東京消防庁「消火栓・防火水槽等」/ 総務局「東京都防災マップ 避難所一覧」）/ 国土地理院API
        </footer>
      </body>
    </html>
  );
}
