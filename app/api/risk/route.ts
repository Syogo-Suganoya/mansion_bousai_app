import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { WARDS } from "@/lib/risk";
import {
  countFirefightingWaterNear,
  fetchRiskFromApi,
  maxFloodDepthNear,
  nearestShelters,
} from "@/lib/tokyoApi";

// 市区町村コード(13101〜13123)から区名を引く
function wardFromMuniCd(muniCd: string): string | undefined {
  const idx = parseInt(muniCd, 10) - 13101;
  return WARDS[idx];
}

// 「西新宿二丁目」→「西新宿」のように丁目部分を落とす（DBフォールバックの前方一致用）
function baseTownName(town: string): string {
  return town.replace(/[一二三四五六七八九十]+丁目$/, "");
}

// 東京都APIが落ちている場合に備えたローカルサンプルデータへのフォールバック
async function riskFromLocalDb(muniCd: string, townName: string) {
  const db = await getDb();
  const exact = await db.query(
    `SELECT * FROM risk_areas WHERE muni_cd = $1 AND town_name = $2 LIMIT 1`,
    [muniCd, townName]
  );
  if (exact.rows[0]) return exact.rows[0];
  const prefix = await db.query(
    `SELECT * FROM risk_areas WHERE muni_cd = $1 AND town_name LIKE $2 || '%'
     ORDER BY town_name LIMIT 1`,
    [muniCd, baseTownName(townName)]
  );
  return prefix.rows[0] ?? null;
}

export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address")?.trim();
  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    // 1. 国土地理院ジオコーディング（住所→座標）
    const geoRes = await fetch(
      `https://msearch.gsi.go.jp/address-search/AddressSearch?q=${encodeURIComponent(address)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const candidates: {
      geometry: { coordinates: [number, number] };
      properties: { title: string };
    }[] = await geoRes.json();

    if (!candidates?.length) {
      return NextResponse.json({
        found: false,
        address,
        message: "住所が見つかりませんでした。「区名+町名」の形式で入力してください。",
      });
    }

    const [lon, lat] = candidates[0].geometry.coordinates;

    // 2. 逆ジオコーディング（座標→町丁目名）
    const revRes = await fetch(
      `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${lat}&lon=${lon}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const rev: { results?: { muniCd: string; lv01Nm: string } } =
      await revRes.json();

    const muniCd = rev.results?.muniCd;
    const townName = rev.results?.lv01Nm;
    const ward = muniCd ? wardFromMuniCd(muniCd) : undefined;

    if (!muniCd || !townName || !ward) {
      return NextResponse.json({
        found: false, address, lat, lon,
        message: "町丁目を特定できませんでした（23区内の住所で入力してください）。",
      });
    }

    // 3. 東京都オープンデータAPIへ並列照会
    //    地域危険度（都市整備局）/ 浸水予想区域図（建設局）/
    //    消火栓・防火水槽等（東京消防庁）/ 避難所一覧（総務局）
    const [riskRes, floodRes, waterRes, shelterRes] = await Promise.allSettled([
      fetchRiskFromApi(ward, townName),
      maxFloodDepthNear(lat, lon),
      countFirefightingWaterNear(lat, lon),
      nearestShelters(lat, lon, ward),
    ]);

    let riskSource: "api" | "sample" | null = null;
    let matchedTown: string | null = null;
    let collapseRank: number | null = null;
    let fireRank: number | null = null;
    let totalRank: number | null = null;

    if (riskRes.status === "fulfilled" && riskRes.value) {
      riskSource = "api";
      matchedTown = riskRes.value.town;
      collapseRank = riskRes.value.collapseRank;
      fireRank = riskRes.value.fireRank;
      totalRank = riskRes.value.totalRank;
    } else if (riskRes.status === "rejected") {
      // API障害時のみローカルサンプルへフォールバック
      const row = await riskFromLocalDb(muniCd, townName);
      if (row) {
        riskSource = "sample";
        matchedTown = row.town_name;
        collapseRank = row.collapse_rank;
        fireRank = row.fire_rank;
        totalRank = row.total_rank;
      }
    }

    if (riskSource === null) {
      return NextResponse.json({
        found: false, address, lat, lon, ward, townName,
        message: `「${ward}${townName}」は地域危険度測定調査の対象外か、データが見つかりませんでした。`,
      });
    }

    const flood =
      floodRes.status === "fulfilled" ? floodRes.value : { depth: 0, basin: null };
    const water =
      waterRes.status === "fulfilled"
        ? waterRes.value
        : { hydrants: null, cisterns: null };
    const shelters = shelterRes.status === "fulfilled" ? shelterRes.value : [];

    return NextResponse.json({
      found: true,
      address, lat, lon, ward, townName, matchedTown,
      collapseRank, fireRank, totalRank,
      riskSource,
      floodDepthM: Math.round(flood.depth * 100) / 100,
      floodBasin: flood.basin,
      floodSource: floodRes.status === "fulfilled" ? "api" : "unavailable",
      hydrants: water.hydrants,
      cisterns: water.cisterns,
      shelters,
    });
  } catch (e) {
    console.error("risk lookup failed:", e);
    return NextResponse.json(
      { error: "判定に失敗しました。時間をおいて再試行してください。" },
      { status: 500 }
    );
  }
}
