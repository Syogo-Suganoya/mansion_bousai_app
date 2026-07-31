// 危険度ランク(1-5)の表示定義
export const RANK_LABELS: Record<number, string> = {
  1: "低い",
  2: "やや低い",
  3: "中程度",
  4: "高い",
  5: "非常に高い",
};

export const RANK_COLORS: Record<number, string> = {
  1: "bg-emerald-500",
  2: "bg-lime-500",
  3: "bg-yellow-500",
  4: "bg-orange-500",
  5: "bg-red-600",
};

export const WARDS = [
  "千代田区", "中央区", "港区", "新宿区", "文京区", "台東区", "墨田区",
  "江東区", "品川区", "目黒区", "大田区", "世田谷区", "渋谷区", "中野区",
  "杉並区", "豊島区", "北区", "荒川区", "板橋区", "練馬区", "足立区",
  "葛飾区", "江戸川区",
];

export const CATEGORIES = [
  "水", "食料", "生理用品", "離乳食", "アレルギー対応食",
  "簡易トイレ", "毛布", "モバイルバッテリー", "医薬品", "おむつ",
];

export type Shelter = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

export type RiskResult = {
  found: boolean;
  address: string;
  lat: number;
  lon: number;
  ward?: string;
  townName?: string;
  matchedTown?: string;
  collapseRank?: number;
  fireRank?: number;
  totalRank?: number;
  riskSource?: "api" | "sample";
  floodDepthM?: number;
  floodBasin?: string | null;
  floodSource?: "api" | "unavailable";
  hydrants?: number | null;
  cisterns?: number | null;
  shelters?: Shelter[];
  message?: string;
};
