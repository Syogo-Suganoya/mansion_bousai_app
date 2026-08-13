import Image from "next/image";
import Link from "next/link";
import step1 from "@/public/guide/step1-status.png";
import step2 from "@/public/guide/step2-risk.png";
import step3 from "@/public/guide/step3-building.png";
import step4 from "@/public/guide/step4-sim.png";
import step5 from "@/public/guide/step5-post.png";
import step6 from "@/public/guide/step6-match.png";

const FEATURES = [
  {
    icon: "🗺️",
    title: "地域危険度の判定",
    desc: "住所を入れるだけで、東京都オープンデータAPI（第9回地域危険度測定調査・5,192町丁目）から建物倒壊・火災・総合危険度、想定浸水深、周辺の消火栓数、近隣避難所をリアルタイムに取得します。",
  },
  {
    icon: "🏢",
    title: "在宅避難適性の診断",
    desc: "築年・構造・階数・居住階を入力すると、耐震基準や耐火性・浸水時の垂直避難可否をルールベースで即時診断。自宅に留まれるマンションかがわかります。",
  },
  {
    icon: "📦",
    title: "備蓄シミュレーター",
    desc: "世帯人数と水・食料・簡易トイレの備蓄量から在宅避難を継続できる日数を算出。目標7日に対するゲージとボトルネック物資を表示します。",
  },
  {
    icon: "📮",
    title: "避難所デジタル目安箱",
    desc: "避難所の不足物資とマンション住民の余剰備蓄をタグベースで投稿し、区×物資カテゴリ単位で需給を自動マッチング。10秒ごとに自動更新されます。",
  },
];

// 画面ごとの機能紹介。順序に意味はなく、それぞれ独立して使える
const GUIDES = [
  {
    tag: "防災カルテ",
    icon: "🚨",
    title: "発災時モードで状況をワンタップ共有",
    desc: "防災カルテの最上部にある3つのボタンで、いまの状況（在宅避難中（安全）/ 要救助 / 避難所へ移動開始）を選びます。選択は端末に保存され、次に開いたときも維持されます。",
    img: step1,
    alt: "発災時モードのボタンで「在宅避難中（安全）」を選択した画面",
    href: "/karte",
  },
  {
    tag: "防災カルテ",
    icon: "🗺️",
    title: "住所を入力して地域危険度を判定",
    desc: "「墨田区京島2丁目」のように区名＋町丁目を入力して「判定」を押すと、危険度ランク（1〜5）・想定最大浸水深・周辺300m四方の消火栓/防火水槽数・近くの指定避難所が表示されます。緑のバッジは実データ（東京都オープンデータAPI）で判定されたことを示します。",
    img: step2,
    alt: "墨田区京島2丁目の判定結果。総合危険度5、浸水深1.16m、消火栓87基、近隣避難所3件",
    href: "/karte",
  },
  {
    tag: "防災カルテ",
    icon: "🏢",
    title: "マンション情報で在宅避難適性を診断",
    desc: "築年（西暦）・構造（RC/SRC/S/W）・建物階数・居住階を入力すると、その場で在宅避難に適しているかの診断コメントが表示されます。入力を変えると結果も即座に更新されます。",
    img: step3,
    alt: "築年2005年・RC造・14階建て8階居住の入力で「在宅避難に適した建物条件です」と診断された画面",
    href: "/karte",
  },
  {
    tag: "防災カルテ",
    icon: "📦",
    title: "備蓄量から継続可能日数をシミュレート",
    desc: "世帯人数と飲料水（L）・食料（食）・簡易トイレ（回分）の備蓄量を入力すると、在宅避難を続けられる日数とボトルネックの物資がわかります。目標の7日に届くよう備蓄を見直しましょう。",
    img: step4,
    alt: "3人世帯の備蓄入力で2.6日継続可能、ボトルネックは飲料水と表示された画面",
    href: "/karte",
  },
  {
    tag: "目安箱",
    icon: "📮",
    title: "目安箱に不足物資・余剰備蓄を投稿",
    desc: "目安箱の「投稿する」タブで、避難所（不足物資）かマンション住民（余剰備蓄）かを選び、物資カテゴリ・数量・区を指定して投稿します。避難所名や補足は任意です。",
    img: step5,
    alt: "目安箱の投稿フォーム。避難所/住民の選択、物資カテゴリのタグ、数量と区の入力欄",
    href: "/board",
  },
  {
    tag: "目安箱",
    icon: "🤝",
    title: "マッチング状況を確認",
    desc: "「マッチング状況」タブで、区×物資ごとに不足数と提供可能数が集計され、「✅ 充足可能」「🤝 一部マッチ」「🔍 提供者募集中」のステータスで表示されます。10秒ごとに自動更新されるので、発災時も最新の需給が把握できます。",
    img: step6,
    alt: "墨田区の生理用品が一部マッチ、離乳食などが提供者募集中と表示されたマッチング状況画面",
    href: "/board",
  },
];

export default function LandingPage() {
  return (
    <div className="space-y-14">
      {/* ヒーロー: カルテの表紙 */}
      <section className="chart-sheet px-6 py-12 sm:py-16 text-center">
        <div className="chart-tab">KARTE No. 001</div>
        <p className="font-mono text-xs text-(--color-hanko) mb-4">
          東京都オープンデータAPI × マンション防災
        </p>
        <h1 className="font-display text-4xl sm:text-5xl leading-tight">
          自宅の危険度を知り、
          <br />
          在宅避難に備える。
        </h1>
        <p className="mt-5 text-(--color-ink-soft) text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          マンション防災カルテは、住所ひとつで地域の地震危険度・浸水想定を判定し、
          備蓄の過不足を見える化。発災時には避難所と住民の物資をマッチングします。
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-4">
          <Link
            href="/karte"
            className="font-display rounded-full bg-(--color-hanko) px-7 py-3 text-(--color-paper) hover:bg-(--color-hanko-deep)"
          >
            カルテをつける
          </Link>
          <Link
            href="/board"
            className="font-display rounded-full border-2 border-(--color-ink) px-7 py-3 text-(--color-ink) hover:bg-(--color-ink) hover:text-(--color-paper)"
          >
            目安箱を見る
          </Link>
        </div>
      </section>

      {/* できること */}
      <section>
        <h2 className="font-display text-2xl text-center">このアプリでできること</h2>
        <p className="mt-2 text-center font-mono text-xs text-(--color-ink-soft)">
          「平時の備え」と「発災時の助け合い」を1つのカルテで
        </p>
        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <div key={f.title} className="chart-sheet p-5">
              <div className="chart-tab">{String(i + 1).padStart(2, "0")}</div>
              <p className="text-2xl">{f.icon}</p>
              <h3 className="mt-2 font-display text-lg">{f.title}</h3>
              <p className="mt-1 text-sm text-(--color-ink-soft) leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 操作手順 */}
      <section>
        <h2 className="font-display text-2xl text-center">画面でみる機能</h2>
        <p className="mt-2 text-center font-mono text-xs text-(--color-ink-soft)">
          実際の画面で紹介します。どれから使ってもかまいません
        </p>
        <div className="mt-7 space-y-9">
          {GUIDES.map((s) => (
            <div key={s.title} className="chart-sheet p-5 sm:p-6">
              <div className="chart-tab">{s.tag}</div>
              <div className="flex items-center gap-3 pt-1">
                <span className="hanko shrink-0 w-9 h-9 flex items-center justify-center text-base">
                  {s.icon}
                </span>
                <h3 className="font-display text-lg">{s.title}</h3>
              </div>
              <p className="mt-3 text-sm text-(--color-ink-soft) leading-relaxed">{s.desc}</p>
              <div className="mt-4 overflow-hidden border border-(--color-paper-deep)">
                <Image
                  src={s.img}
                  alt={s.alt}
                  className="w-full h-auto"
                  sizes="(max-width: 896px) 100vw, 832px"
                  placeholder="blur"
                />
              </div>
              <p className="mt-3 text-right">
                <Link href={s.href} className="font-mono text-xs text-(--color-hanko) hover:underline">
                  この画面を開く →
                </Link>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* しめのCTA */}
      <section className="chart-sheet px-6 py-10 text-center">
        <div className="chart-tab">承認</div>
        <h2 className="font-display text-2xl">まずは自宅の危険度チェックから</h2>
        <p className="mt-2 text-sm text-(--color-ink-soft)">
          住所を入力するだけ。30秒で自宅周辺のリスクがわかります。
        </p>
        <Link
          href="/karte"
          className="mt-6 inline-block font-display rounded-full bg-(--color-anzen) px-8 py-3 text-(--color-paper) hover:bg-(--color-anzen-deep)"
        >
          防災カルテをはじめる
        </Link>
      </section>
    </div>
  );
}
