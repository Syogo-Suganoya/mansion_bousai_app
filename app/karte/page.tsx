"use client";

import { useEffect, useState } from "react";
import { RANK_COLORS, RANK_LABELS, type RiskResult } from "@/lib/risk";
import {
  assessBuilding, calcDays, TARGET_DAYS,
  type BuildingInput, type StockInput,
} from "@/lib/simulator";

const STATUSES = [
  { key: "safe", label: "在宅避難中（安全）", color: "text-(--color-anzen)" },
  { key: "rescue", label: "要救助", color: "text-(--color-hanko)" },
  { key: "moving", label: "避難所へ移動開始", color: "text-(--color-keikai)" },
] as const;

function RankBadge({ label, rank }: { label: string; rank: number }) {
  return (
    <div className="flex flex-col items-center gap-1 border border-(--color-paper-deep) bg-(--color-paper) p-3">
      <span className="text-xs text-(--color-ink-soft)">{label}</span>
      <span
        className={`${RANK_COLORS[rank]} text-white rounded-full w-11 h-11 flex items-center justify-center font-mono text-xl`}
      >
        {rank}
      </span>
      <span className="text-xs font-medium">{RANK_LABELS[rank]}</span>
    </div>
  );
}

export default function Home() {
  // 発災時モード
  const [status, setStatus] = useState<string | null>(null);
  useEffect(() => {
    setStatus(localStorage.getItem("bousai-status"));
  }, []);
  const changeStatus = (key: string) => {
    setStatus(key);
    localStorage.setItem("bousai-status", key);
  };

  // 危険度判定
  const [address, setAddress] = useState("");
  const [risk, setRisk] = useState<RiskResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lookup = async () => {
    if (!address.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/risk?address=${encodeURIComponent(address)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "判定に失敗しました");
      setRisk(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "判定に失敗しました");
      setRisk(null);
    } finally {
      setLoading(false);
    }
  };

  // 建物情報
  const [building, setBuilding] = useState<BuildingInput>({
    builtYear: 2005, structure: "RC", floors: 14, ownFloor: 8,
  });
  const assessment = assessBuilding(building);

  // 備蓄シミュレーター
  const [stock, setStock] = useState<StockInput>({
    household: 3, waterLiters: 24, foodMeals: 27, toiletPacks: 60,
  });
  const sim = calcDays(stock);
  const gaugePct = Math.min(100, (sim.days / TARGET_DAYS) * 100);

  return (
    <div className="space-y-8">
      {/* 発災時モード: 押印で状況を共有 */}
      <section className="chart-sheet p-4 sm:p-5">
        <div className="chart-tab">現況</div>
        <h2 className="font-mono text-xs text-(--color-ink-soft) mb-3 pt-1">
          発災時モード — 押印して現在の状況を共有
        </h2>
        <div className="grid grid-cols-3 gap-3">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              onClick={() => changeStatus(s.key)}
              className="flex flex-col items-center gap-2 py-2"
            >
              <span
                className={`hanko w-14 h-14 flex items-center justify-center text-center font-display text-xs leading-tight transition-opacity
                  ${status === s.key ? `${s.color} opacity-100 hanko-stamped` : "text-(--color-ink-soft) opacity-30 hover:opacity-60"}`}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 危険度判定 */}
      <section className="chart-sheet p-5">
        <div className="chart-tab">地域危険度</div>
        <h2 className="font-display text-lg mb-1 pt-1">自宅の地域危険度を調べる</h2>
        <p className="text-sm text-(--color-ink-soft) mb-3">
          住所から町丁目単位の地震危険度・浸水想定を判定します（例: 墨田区京島2丁目、新宿区西新宿2丁目）
        </p>
        <div className="flex gap-2">
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="例: 墨田区京島2丁目"
            className="flex-1 border border-(--color-paper-deep) bg-(--color-paper) px-3 py-2 focus:outline-2 focus:outline-(--color-hanko)"
          />
          <button
            onClick={lookup}
            disabled={loading}
            className="font-display rounded-full bg-(--color-ink) px-5 py-2 text-(--color-paper) hover:bg-(--color-ink-soft) disabled:opacity-50"
          >
            {loading ? "判定中…" : "判定"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-(--color-hanko)">{error}</p>}
        {risk && !risk.found && (
          <p className="mt-3 border border-(--color-keikai) bg-(--color-paper) p-3 text-sm text-(--color-ink-soft)">
            {risk.message}
          </p>
        )}
        {risk?.found && (
          <div className="mt-4 space-y-4">
            <p className="text-sm flex items-center gap-2 flex-wrap">
              判定地域: <b>{risk.ward} {risk.matchedTown}</b>
              {risk.riskSource === "api" ? (
                <span className="border border-(--color-anzen) text-(--color-anzen) px-2 py-0.5 font-mono text-xs">
                  実データ・第9回調査
                </span>
              ) : (
                <span className="border border-(--color-keikai) text-(--color-keikai) px-2 py-0.5 font-mono text-xs">
                  サンプルデータ（フォールバック）
                </span>
              )}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <RankBadge label="建物倒壊危険度" rank={risk.collapseRank!} />
              <RankBadge label="火災危険度" rank={risk.fireRank!} />
              <RankBadge label="総合危険度" rank={risk.totalRank!} />
              <div className="flex flex-col items-center gap-1 border border-(--color-paper-deep) bg-(--color-paper) p-3">
                <span className="text-xs text-(--color-ink-soft)">想定最大浸水深</span>
                <span className={`font-mono text-lg ${risk.floodDepthM! > 0 ? "text-(--color-hanko)" : "text-(--color-anzen)"}`}>
                  {risk.floodDepthM! > 0 ? `${risk.floodDepthM} m` : "想定なし"}
                </span>
                <span className="text-xs">
                  {risk.floodDepthM! >= 2 ? "垂直避難必須"
                    : risk.floodDepthM! > 0 ? `浸水注意（${risk.floodBasin ?? "周辺流域"}）` : "─"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-(--color-paper-deep) p-3 text-center">
                <p className="text-xs text-(--color-ink-soft)">周辺300m四方の消火栓</p>
                <p className="font-mono text-xl">
                  {risk.hydrants ?? "—"} <span className="text-sm font-normal">基</span>
                </p>
              </div>
              <div className="border border-(--color-paper-deep) p-3 text-center">
                <p className="text-xs text-(--color-ink-soft)">周辺300m四方の防火水槽等</p>
                <p className="font-mono text-xl">
                  {risk.cisterns ?? "—"} <span className="text-sm font-normal">基</span>
                </p>
              </div>
            </div>
            {risk.shelters && risk.shelters.length > 0 && (
              <div>
                <p className="text-sm font-bold mb-1">近くの指定避難所</p>
                <ul className="space-y-1 text-sm">
                  {risk.shelters.map((s) => (
                    <li key={s.name} className="flex justify-between border border-(--color-paper-deep) px-3 py-2">
                      <span>{s.name} <span className="text-(--color-ink-soft) text-xs">{s.address}</span></span>
                      <span className="font-mono shrink-0 ml-2">約{(s.distanceKm * 1000).toFixed(0)}m</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-xs text-(--color-ink-soft)">
              ※ 浸水深は都管理の中小河川・下水道（内水）の想定であり、荒川等の大河川氾濫は含みません。
            </p>
          </div>
        )}
      </section>

      {/* 建物情報 */}
      <section className="chart-sheet p-5">
        <div className="chart-tab">建物診断</div>
        <h2 className="font-display text-lg mb-3 pt-1">マンション情報から在宅避難適性を診断</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            築年（西暦）
            <input type="number" value={building.builtYear}
              onChange={(e) => setBuilding({ ...building, builtYear: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
          <label className="flex flex-col gap-1">
            構造
            <select value={building.structure}
              onChange={(e) => setBuilding({ ...building, structure: e.target.value as BuildingInput["structure"] })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)">
              <option value="RC">RC（鉄筋コンクリート）</option>
              <option value="SRC">SRC（鉄骨鉄筋コンクリート）</option>
              <option value="S">S（鉄骨）</option>
              <option value="W">W（木造）</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            建物階数
            <input type="number" min={1} value={building.floors}
              onChange={(e) => setBuilding({ ...building, floors: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
          <label className="flex flex-col gap-1">
            居住階
            <input type="number" min={1} value={building.ownFloor}
              onChange={(e) => setBuilding({ ...building, ownFloor: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
        </div>
        <div className={`mt-4 border p-4 ${assessment.suitable ? "border-(--color-anzen)" : "border-(--color-hanko)"}`}>
          <p className={`font-display mb-2 flex items-center gap-2 ${assessment.suitable ? "text-(--color-anzen)" : "text-(--color-hanko)"}`}>
            <span className={`hanko w-8 h-8 shrink-0 flex items-center justify-center text-[0.6rem]`}>
              {assessment.suitable ? "適" : "要"}
            </span>
            {assessment.suitable ? "在宅避難に適した建物条件です" : "在宅避難の前に確認が必要です"}
          </p>
          <ul className="space-y-1 text-sm text-(--color-ink-soft) list-disc pl-5">
            {assessment.notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      </section>

      {/* 備蓄シミュレーター */}
      <section className="chart-sheet p-5">
        <div className="chart-tab">備蓄</div>
        <h2 className="font-display text-lg mb-1 pt-1">在宅避難継続可能日数シミュレーター</h2>
        <p className="text-sm text-(--color-ink-soft) mb-3">
          ライフライン停止を想定し、備蓄で何日間在宅避難を継続できるかを算出します（目標: {TARGET_DAYS}日）
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            世帯人数
            <input type="number" min={1} value={stock.household}
              onChange={(e) => setStock({ ...stock, household: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
          <label className="flex flex-col gap-1">
            飲料水（L）
            <input type="number" min={0} value={stock.waterLiters}
              onChange={(e) => setStock({ ...stock, waterLiters: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
          <label className="flex flex-col gap-1">
            食料（食）
            <input type="number" min={0} value={stock.foodMeals}
              onChange={(e) => setStock({ ...stock, foodMeals: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
          <label className="flex flex-col gap-1">
            簡易トイレ（回分）
            <input type="number" min={0} value={stock.toiletPacks}
              onChange={(e) => setStock({ ...stock, toiletPacks: +e.target.value })}
              className="border border-(--color-paper-deep) bg-(--color-paper) px-2 py-1.5 focus:outline-2 focus:outline-(--color-hanko)" />
          </label>
        </div>

        <div className="mt-5">
          <div className="flex items-end justify-between mb-1">
            <span className="font-mono text-4xl text-(--color-ink)">
              {String(sim.days).padStart(2, "0")}
              <span className="text-base font-body text-(--color-ink-soft)"> 日継続可能</span>
            </span>
            <span className={`text-sm font-bold ${sim.achieved ? "text-(--color-anzen)" : "text-(--color-keikai)"}`}>
              {sim.achieved ? "目標達成" : `ボトルネック: ${sim.bottleneck}`}
            </span>
          </div>
          <div className="h-3 w-full bg-(--color-paper-deep) overflow-hidden">
            <div
              className={`h-full transition-all ${sim.achieved ? "bg-(--color-anzen)" : "bg-(--color-keikai)"}`}
              style={{ width: `${gaugePct}%` }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
            {Object.entries(sim.breakdown).map(([k, v]) => (
              <div key={k} className="border border-(--color-paper-deep) py-2">
                <div className="text-(--color-ink-soft) text-xs">{k}</div>
                <div className="font-mono">{v} 日分</div>
              </div>
            ))}
          </div>
          {!sim.achieved && (
            <p className="mt-3 text-sm text-(--color-ink-soft)">
              {sim.bottleneck}の備蓄を増やすと継続日数が伸びます。余剰が出た物資は
              <a href="/board" className="text-(--color-hanko) underline">目安箱</a>
              で避難所と共有できます。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
