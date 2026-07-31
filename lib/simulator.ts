// 在宅避難継続可能日数のルールベース算出
// 東京都の推奨: 最低3日、マンション在宅避難はできれば1週間分の備蓄

export type StockInput = {
  household: number;     // 世帯人数
  waterLiters: number;   // 飲料水(L)
  foodMeals: number;     // 食料(食)
  toiletPacks: number;   // 簡易トイレ(回分)
};

export type BuildingInput = {
  builtYear: number;     // 築年(西暦)
  structure: "RC" | "SRC" | "S" | "W";
  floors: number;        // 建物階数
  ownFloor: number;      // 居住階
};

export const TARGET_DAYS = 7;

// 1人1日あたりの消費量
const WATER_PER_DAY = 3;   // L
const MEALS_PER_DAY = 3;   // 食
const TOILET_PER_DAY = 5;  // 回

export function calcDays(s: StockInput) {
  const n = Math.max(1, s.household);
  const water = s.waterLiters / (WATER_PER_DAY * n);
  const food = s.foodMeals / (MEALS_PER_DAY * n);
  const toilet = s.toiletPacks / (TOILET_PER_DAY * n);
  const days = Math.min(water, food, toilet);
  const bottleneck =
    days === water ? "飲料水" : days === food ? "食料" : "簡易トイレ";
  return {
    days: Math.floor(days * 10) / 10,
    breakdown: {
      水: Math.floor(water * 10) / 10,
      食料: Math.floor(food * 10) / 10,
      簡易トイレ: Math.floor(toilet * 10) / 10,
    },
    bottleneck,
    achieved: days >= TARGET_DAYS,
  };
}

const STRUCTURE_LABELS = { RC: "鉄筋コンクリート造", SRC: "鉄骨鉄筋コンクリート造", S: "鉄骨造", W: "木造" };

// 建物条件から在宅避難の適性を定性評価する
export function assessBuilding(b: BuildingInput) {
  const notes: string[] = [];
  let suitable = true;

  if (b.builtYear < 1981) {
    suitable = false;
    notes.push("旧耐震基準(1981年以前)の建物です。専門家による耐震診断の受診を強く推奨します。");
  } else if (b.builtYear < 2000) {
    notes.push("新耐震基準ですが2000年基準以前です。念のため耐震性の確認を推奨します。");
  } else {
    notes.push("新耐震基準(2000年基準以降)の建物です。倒壊リスクは相対的に低いと考えられます。");
  }

  if (b.structure === "W") {
    suitable = false;
    notes.push("木造建物は倒壊・火災リスクが相対的に高く、地域危険度によっては早期避難を検討してください。");
  } else {
    notes.push(`${STRUCTURE_LABELS[b.structure]}のため、建物自体の耐火性は比較的高い構造です。`);
  }

  if (b.ownFloor >= 10) {
    notes.push("高層階のため、エレベーター停止時は階段移動が困難になります。在宅避難前提の備蓄増強(+2〜3日分)を推奨します。");
  }
  if (b.ownFloor >= 2) {
    notes.push("2階以上のため、浸水時も垂直避難で自宅に留まれる可能性が高い立地です。");
  } else {
    notes.push("1階居住のため、浸水想定がある地域では上層階または避難所への移動を優先してください。");
  }

  return { suitable, notes };
}
