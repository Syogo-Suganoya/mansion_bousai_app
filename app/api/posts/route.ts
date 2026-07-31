import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { CATEGORIES, WARDS } from "@/lib/risk";

export async function GET() {
  const db = await getDb();
  const { rows: posts } = await db.query(
    `SELECT id, role, kind, category, quantity, ward, place, note, created_at
     FROM posts ORDER BY created_at DESC LIMIT 100`
  );

  // 区×カテゴリ単位で不足量と提供量を集計し、両方が立っていればマッチ
  const { rows: matches } = await db.query(
    `SELECT ward, category,
            SUM(quantity) FILTER (WHERE kind = 'need')  AS need_qty,
            SUM(quantity) FILTER (WHERE kind = 'offer') AS offer_qty
     FROM posts
     GROUP BY ward, category
     HAVING SUM(quantity) FILTER (WHERE kind = 'need') IS NOT NULL
     ORDER BY ward, category`
  );

  return NextResponse.json({
    posts,
    matches: matches.map((m) => ({
      ward: m.ward,
      category: m.category,
      needQty: Number(m.need_qty ?? 0),
      offerQty: Number(m.offer_qty ?? 0),
      matched: Number(m.offer_qty ?? 0) > 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { role, kind, category, quantity, ward, place, note } = body ?? {};

  if (
    !["shelter", "resident"].includes(role) ||
    !["need", "offer"].includes(kind) ||
    !CATEGORIES.includes(category) ||
    !WARDS.includes(ward) ||
    !Number.isFinite(Number(quantity)) || Number(quantity) < 1
  ) {
    return NextResponse.json({ error: "入力内容が不正です" }, { status: 400 });
  }

  const db = await getDb();
  const { rows } = await db.query(
    `INSERT INTO posts (role, kind, category, quantity, ward, place, note)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [role, kind, category, Math.floor(Number(quantity)), ward,
     (place ?? "").slice(0, 100) || null, (note ?? "").slice(0, 300) || null]
  );
  return NextResponse.json({ post: rows[0] }, { status: 201 });
}
