// 東京都オープンデータAPI (https://spec.api.metro.tokyo.lg.jp/spec/search) クライアント
// すべて POST /api/{apiId}/json に絞り込み条件を渡す共通仕様

const BASE = "https://service.api.metro.tokyo.lg.jp/api";

// 地震に関する地域危険度測定調査（第9回）地域危険度一覧(令和4年9月公表) / 東京都都市整備局
const RISK_API = "t000008d0000000012-5611a503ba1c2785d49d69234d168148-0";

// 東京消防庁マップ 消火栓 位置情報 / 東京消防庁
const HYDRANT_API = "t000017d0000000007-d64b288f646e2e57e25c476617aa0fe4-0";

// 東京消防庁マップ 防火水槽等 位置情報（4分割） / 東京消防庁
const CISTERN_APIS = [
  "t000017d0000000007-1cd0eb89a89e1a7c2e1cf029046d73ca-0",
  "t000017d0000000007-27c7f6d0b1ccf05953c68e6173a838f3-0",
  "t000017d0000000007-2822d235be088fe775b1ea09daede210-0",
  "t000017d0000000007-e9a7c45848709d03c0bd47c62325a7ae-0",
];

// 東京都防災マップ 避難所一覧データ / 東京都総務局（CC BY 4.0）
const SHELTER_API = "t000003d0000000093-0af9bfa497bc7be6ef83e5bfd1fdcfc6-0";

// 浸水予想区域図（改定）浸水深・地盤高 / 東京都下水道局（区部を覆う主要流域）
const FLOOD_APIS: { id: string; basin: string }[] = [
  { id: "t000020d0000000043-7cb9317c6809f01334fe5e6db902a911-0", basin: "江東内部河川" },
  { id: "t000020d0000000043-e5795bd14b180883b9c846ace45a1682-0", basin: "中川・綾瀬川(1)" },
  { id: "t000020d0000000043-337469595ff7bd36d9f45cd816bb501c-0", basin: "中川・綾瀬川(2)" },
  { id: "t000020d0000000043-31f7d40ef88494afd54cc797932e1468-0", basin: "隅田川・新河岸川" },
  { id: "t000020d0000000043-b24d78253b3a7116e106e25c15cdd98a-0", basin: "神田川(1)" },
  { id: "t000020d0000000043-8d28f14b85dc4e68bd0381da36f0fcad-0", basin: "神田川(2)" },
  { id: "t000020d0000000043-08dc16d110334e3fbea642d8c292a0e5-0", basin: "石神井川・白子川" },
  { id: "t000020d0000000043-c9a8c91ba862a9109a687c43c1272377-0", basin: "城南地区河川(1)" },
  { id: "t000020d0000000043-9dae045e957138ee1d46879270577071-0", basin: "城南地区河川(2)" },
  { id: "t000020d0000000043-7efbb8790673b97a78cc068b07fa5dbe-0", basin: "野川・仙川ほか" },
];

type SearchCondition = {
  conditionRelationship?: "and" | "or";
  stringAndSearch?: { column: string; relationship: string; condition: string }[];
  numericAndSearch?: { column: string; relationship: string; condition: string }[];
};

type ApiResponse = { total: number; hits: Record<string, unknown>[] };

// 同一クエリの連打を避ける簡易インメモリキャッシュ（TTL 6時間）
const cache = new Map<string, { t: number; v: ApiResponse }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function query(
  apiId: string,
  searchCondition: SearchCondition | null,
  limit: number
): Promise<ApiResponse> {
  const body = searchCondition ? { searchCondition } : {};
  const key = `${apiId}:${limit}:${JSON.stringify(body)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < CACHE_TTL_MS) return hit.v;

  const res = await fetch(`${BASE}/${apiId}/json?limit=${limit}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Tokyo API ${apiId} responded ${res.status}`);
  const data = (await res.json()) as ApiResponse;
  cache.set(key, { t: Date.now(), v: data });
  return data;
}

// 「京島二丁目」→「京島2丁目」（APIの町丁目名はアラビア数字表記）
const KANJI_DIGITS: Record<string, number> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};

function kanjiNumToArabic(k: string): number {
  if (k === "十") return 10;
  const ti = k.indexOf("十");
  if (ti === -1) return KANJI_DIGITS[k] ?? NaN;
  const tens = ti === 0 ? 1 : KANJI_DIGITS[k[ti - 1]];
  const ones = ti === k.length - 1 ? 0 : KANJI_DIGITS[k[ti + 1]];
  return tens * 10 + ones;
}

export function toApiTownName(lv01Nm: string): string {
  return lv01Nm.replace(
    /([一二三四五六七八九十]+)丁目$/,
    (_, kanji) => `${kanjiNumToArabic(kanji)}丁目`
  );
}

export type TokyoRiskRow = {
  ward: string;
  town: string;
  collapseRank: number;
  fireRank: number;
  totalRank: number;
};

function toRiskRow(hit: Record<string, unknown>): TokyoRiskRow {
  return {
    ward: String(hit["区市町名"]),
    town: String(hit["町丁目名"]),
    collapseRank: Number(hit["建物倒壊危険度ランク"]),
    fireRank: Number(hit["火災危険度ランク"]),
    totalRank: Number(hit["総合危険度ランク"]),
  };
}

// 地域危険度: 完全一致 → 丁目を除いた前方一致（部分一致）の順で照合
export async function fetchRiskFromApi(
  ward: string,
  townName: string
): Promise<TokyoRiskRow | null> {
  const apiTown = toApiTownName(townName);
  const exact = await query(
    RISK_API,
    {
      conditionRelationship: "and",
      stringAndSearch: [
        { column: "区市町名", relationship: "eq", condition: ward },
        { column: "町丁目名", relationship: "eq", condition: apiTown },
      ],
    },
    1
  );
  if (exact.hits.length) return toRiskRow(exact.hits[0]);

  const base = apiTown.replace(/\d+丁目$/, "");
  if (!base) return null;
  const partial = await query(
    RISK_API,
    {
      conditionRelationship: "and",
      stringAndSearch: [
        { column: "区市町名", relationship: "eq", condition: ward },
        { column: "町丁目名", relationship: "contains", condition: base },
      ],
    },
    1
  );
  return partial.hits.length ? toRiskRow(partial.hits[0]) : null;
}

function bboxCondition(lat: number, lon: number, dLat: number, dLon: number) {
  return {
    conditionRelationship: "and" as const,
    numericAndSearch: [
      { column: "緯度", relationship: "ge", condition: String(lat - dLat) },
      { column: "緯度", relationship: "le", condition: String(lat + dLat) },
      { column: "経度", relationship: "ge", condition: String(lon - dLon) },
      { column: "経度", relationship: "le", condition: String(lon + dLon) },
    ],
  };
}

// 浸水予想区域図: 自宅周辺約150m四方のメッシュ点の最大浸水深(m)を返す
// ※ 都管理の中小河川・内水の想定であり、荒川等の大河川氾濫は含まない
export async function maxFloodDepthNear(
  lat: number,
  lon: number
): Promise<{ depth: number; basin: string | null }> {
  const cond = bboxCondition(lat, lon, 0.0015, 0.0018);
  const results = await Promise.allSettled(
    FLOOD_APIS.map(async (f) => {
      const r = await query(f.id, cond, 1000);
      const depths = r.hits
        .map((h) => Number(h["浸水深"]))
        .filter((d) => Number.isFinite(d));
      return { basin: f.basin, depth: depths.length ? Math.max(...depths) : 0 };
    })
  );
  let best = { depth: 0, basin: null as string | null };
  for (const r of results) {
    if (r.status === "fulfilled" && r.value.depth > best.depth) {
      best = { depth: r.value.depth, basin: r.value.basin };
    }
  }
  return best;
}

// 消火栓・防火水槽等: 自宅周辺約300m四方の設置数
export async function countFirefightingWaterNear(
  lat: number,
  lon: number
): Promise<{ hydrants: number; cisterns: number }> {
  const cond = bboxCondition(lat, lon, 0.0027, 0.0033);
  const [hydrantRes, ...cisternRes] = await Promise.allSettled([
    query(HYDRANT_API, cond, 0),
    ...CISTERN_APIS.map((id) => query(id, cond, 0)),
  ]);
  const total = (r: PromiseSettledResult<ApiResponse>) =>
    r.status === "fulfilled" ? r.value.total : 0;
  return {
    hydrants: total(hydrantRes),
    cisterns: cisternRes.reduce((s, r) => s + total(r), 0),
  };
}

export type Shelter = {
  name: string;
  address: string;
  lat: number;
  lon: number;
  distanceKm: number;
};

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// 東京都防災マップ避難所一覧から、区内で自宅に近い順に返す
export async function nearestShelters(
  lat: number,
  lon: number,
  ward: string,
  n = 3
): Promise<Shelter[]> {
  const r = await query(
    SHELTER_API,
    {
      conditionRelationship: "and",
      stringAndSearch: [
        { column: "指定市区町村名", relationship: "eq", condition: ward },
      ],
    },
    1000
  );
  return r.hits
    .map((h) => ({
      name: String(h["避難所_施設名称"]),
      address: String(h["所在地住所"]),
      lat: Number(h["緯度"]),
      lon: Number(h["経度"]),
      distanceKm: haversineKm(lat, lon, Number(h["緯度"]), Number(h["経度"])),
    }))
    .filter((s) => Number.isFinite(s.distanceKm))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, n);
}
