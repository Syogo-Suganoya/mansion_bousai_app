"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, WARDS } from "@/lib/risk";

type Post = {
  id: number;
  role: "shelter" | "resident";
  kind: "need" | "offer";
  category: string;
  quantity: number;
  ward: string;
  place: string | null;
  note: string | null;
  created_at: string;
};

type Match = {
  ward: string;
  category: string;
  needQty: number;
  offerQty: number;
  matched: boolean;
};

const POLL_MS = 10000;

export default function Board() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [tab, setTab] = useState<"match" | "post">("match");

  // 投稿フォーム
  const [role, setRole] = useState<"shelter" | "resident">("shelter");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [quantity, setQuantity] = useState(10);
  const [ward, setWard] = useState(WARDS[6]); // 墨田区
  const [place, setPlace] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const kind = role === "shelter" ? "need" : "offer";

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/posts");
      const data = await res.json();
      setPosts(data.posts ?? []);
      setMatches(data.matches ?? []);
    } catch {
      /* ポーリング失敗は次回に任せる */
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const submit = async () => {
    setSubmitting(true);
    setMessage("");
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, kind, category, quantity, ward, place, note }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "投稿に失敗しました");
      }
      setMessage("✅ 投稿しました");
      setPlace("");
      setNote("");
      await load();
      setTab("match");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "投稿に失敗しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl">避難所デジタル目安箱</h1>
        <p className="text-sm text-(--color-ink-soft) mt-1">
          避難所の物資ニーズと、周辺マンションの余剰備蓄をリアルタイムにマッチングします（{POLL_MS / 1000}秒ごと自動更新）
        </p>
      </div>

      <div className="flex gap-1.5">
        <button
          onClick={() => setTab("match")}
          className={`font-display text-sm px-4 pt-1.5 pb-2 rounded-t-md ${tab === "match" ? "bg-(--color-paper-card) border border-b-0 border-(--color-paper-deep) text-(--color-ink)" : "bg-(--color-tab-deep) text-(--color-paper) hover:bg-(--color-tab)"}`}
        >
          マッチング状況
        </button>
        <button
          onClick={() => setTab("post")}
          className={`font-display text-sm px-4 pt-1.5 pb-2 rounded-t-md ${tab === "post" ? "bg-(--color-paper-card) border border-b-0 border-(--color-paper-deep) text-(--color-ink)" : "bg-(--color-tab-deep) text-(--color-paper) hover:bg-(--color-tab)"}`}
        >
          投稿する
        </button>
      </div>

      {tab === "post" && (
        <section className="chart-sheet p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setRole("shelter")}
              className={`py-3 text-sm font-display border-2 ${role === "shelter" ? "border-(--color-hanko) bg-(--color-paper) text-(--color-hanko)" : "border-(--color-paper-deep) text-(--color-ink-soft)"}`}
            >
              避難所です<br /><span className="font-body font-normal text-xs">不足物資を投稿</span>
            </button>
            <button
              onClick={() => setRole("resident")}
              className={`py-3 text-sm font-display border-2 ${role === "resident" ? "border-(--color-anzen) bg-(--color-paper) text-(--color-anzen)" : "border-(--color-paper-deep) text-(--color-ink-soft)"}`}
            >
              マンション住民です<br /><span className="font-body font-normal text-xs">余剰備蓄を提供</span>
            </button>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">物資カテゴリ</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`rounded-full px-3 py-1.5 text-sm border ${category === c ? "bg-(--color-ink) text-(--color-paper) border-(--color-ink)" : "border-(--color-paper-deep) text-(--color-ink-soft) hover:bg-(--color-paper-deep)"}`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="flex flex-col gap-1">
              数量
              <input type="number" min={1} value={quantity}
                onChange={(e) => setQuantity(+e.target.value)}
                className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
            </label>
            <label className="flex flex-col gap-1">
              地域（区）
              <select value={ward} onChange={(e) => setWard(e.target.value)}
                className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)">
                {WARDS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            {role === "shelter" ? "避難所名（任意）" : "マンション名（任意）"}
            <input value={place} onChange={(e) => setPlace(e.target.value)}
              placeholder={role === "shelter" ? "例: 区立○○小学校" : "例: ○○タワー管理組合"}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            補足（任意）
            <input value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="例: アレルギー対応のもの希望"
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>

          <button
            onClick={submit}
            disabled={submitting}
            className={`w-full font-display py-3 text-(--color-paper) disabled:opacity-50 ${role === "shelter" ? "bg-(--color-hanko) hover:bg-(--color-hanko-deep)" : "bg-(--color-anzen) hover:bg-(--color-anzen-deep)"}`}
          >
            {submitting ? "送信中…" : role === "shelter" ? "不足物資を投稿する" : "余剰備蓄を提供する"}
          </button>
          {message && <p className="text-sm text-center">{message}</p>}
        </section>
      )}

      {tab === "match" && (
        <>
          <section className="chart-sheet p-5">
            <div className="chart-tab">需給</div>
            <h2 className="font-display mb-3 pt-1">地域×物資のマッチング状況</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-(--color-ink-soft)">まだニーズ投稿がありません。</p>
            ) : (
              <div className="space-y-2">
                {matches.map((m) => (
                  <div
                    key={`${m.ward}-${m.category}`}
                    className={`flex items-center justify-between border p-3 text-sm ${m.matched ? "border-(--color-anzen)" : "border-(--color-keikai)"}`}
                  >
                    <div>
                      <span className="font-bold">{m.ward} / {m.category}</span>
                      <span className="ml-2 text-(--color-ink-soft)">
                        不足 {m.needQty} ・ 提供可能 {m.offerQty}
                      </span>
                    </div>
                    <span className={`font-mono text-xs ${m.matched ? "text-(--color-anzen)" : "text-(--color-keikai)"}`}>
                      {m.matched
                        ? m.offerQty >= m.needQty ? "充足可能" : "一部マッチ"
                        : "提供者募集中"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="chart-sheet p-5">
            <div className="chart-tab">新着</div>
            <h2 className="font-display mb-3 pt-1">新着投稿</h2>
            <ul className="divide-y divide-(--color-paper-deep)">
              {posts.map((p) => (
                <li key={p.id} className="py-2.5 text-sm flex items-start gap-3">
                  <span
                    className={`mt-0.5 shrink-0 px-2 py-0.5 font-mono text-xs text-(--color-paper) ${p.kind === "need" ? "bg-(--color-hanko)" : "bg-(--color-anzen)"}`}
                  >
                    {p.kind === "need" ? "不足" : "提供"}
                  </span>
                  <div className="min-w-0">
                    <p>
                      <b>{p.ward}</b> — {p.category} × {p.quantity}
                      {p.place && <span className="text-(--color-ink-soft)">（{p.place}）</span>}
                    </p>
                    {p.note && <p className="text-(--color-ink-soft) truncate">{p.note}</p>}
                    <p className="text-xs text-(--color-ink-soft)">
                      {new Date(p.created_at).toLocaleString("ja-JP")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  );
}
