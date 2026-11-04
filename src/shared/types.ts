export const CATEGORIES = ["top", "bottom", "outer", "onepiece", "shoes"] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABEL: Record<Category, string> = {
  top: "トップス",
  bottom: "ボトムス",
  outer: "アウター",
  onepiece: "ワンピース",
  shoes: "シューズ",
};

export type Gender = "mens" | "womens" | "all";

interface SubDef {
  id: string;
  label: string;
  only?: Exclude<Gender, "all">;
}

export const SUBCATEGORIES: Record<Category, SubDef[]> = {
  top: [
    { id: "tshirt", label: "Tシャツ" },
    { id: "longtee", label: "ロンT" },
    { id: "shirt", label: "シャツ" },
    { id: "blouse", label: "ブラウス", only: "womens" },
    { id: "polo", label: "ポロシャツ" },
    { id: "knit", label: "ニット" },
    { id: "sweat", label: "スウェット" },
    { id: "hoodie", label: "パーカー" },
    { id: "cardigan", label: "カーディガン" },
    { id: "tank", label: "タンクトップ" },
  ],
  bottom: [
    { id: "denim", label: "デニム" },
    { id: "slacks", label: "スラックス" },
    { id: "chino", label: "チノパン" },
    { id: "wide", label: "ワイドパンツ" },
    { id: "cargo", label: "カーゴパンツ" },
    { id: "shorts", label: "ショーツ" },
    { id: "skirt", label: "スカート", only: "womens" },
  ],
  outer: [
    { id: "jacket", label: "ジャケット" },
    { id: "blouson", label: "ブルゾン" },
    { id: "coat", label: "コート" },
    { id: "trench", label: "トレンチ" },
    { id: "down", label: "ダウン" },
    { id: "denimjacket", label: "デニムジャケット" },
    { id: "mountain", label: "マウンテンパーカー" },
  ],
  onepiece: [
    { id: "dress", label: "ワンピース", only: "womens" },
    { id: "allinone", label: "オールインワン" },
  ],
  shoes: [
    { id: "sneaker", label: "スニーカー" },
    { id: "leather", label: "革靴" },
    { id: "loafer", label: "ローファー" },
    { id: "boots", label: "ブーツ" },
    { id: "sandal", label: "サンダル" },
    { id: "pumps", label: "パンプス", only: "womens" },
  ],
};

export const PATTERNS = ["solid", "stripe", "border", "check", "dot", "print"] as const;
export type Pattern = (typeof PATTERNS)[number];
export const PATTERN_LABEL: Record<Pattern, string> = {
  solid: "無地",
  stripe: "ストライプ",
  border: "ボーダー",
  check: "チェック",
  dot: "ドット",
  print: "柄物",
};

export const FITS = ["loose", "regular", "slim"] as const;
export type Fit = (typeof FITS)[number];
export const FIT_LABEL: Record<Fit, string> = { loose: "ゆったり", regular: "普通", slim: "細め" };

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
export const SEASON_LABEL: Record<Season, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};

export interface ItemTags {
  category: Category;
  subcategory: string;
  /** 主色 #RRGGBB */
  color: string;
  pattern: Pattern;
  fit: Fit;
  /** きちんと度 1(カジュアル)〜5(フォーマル) */
  formality: number;
  /** 暖かさ 1(薄手)〜5(厚手) */
  warmth: number;
  seasons: Season[];
}

export type ItemStatus = "processing" | "review" | "ready";

export interface Item extends ItemTags {
  id: string;
  status: ItemStatus;
  imageKey: string;
  cutoutKey: string | null;
  wearCount: number;
  lastWornAt: string | null;
  createdAt: string;
  brand: string | null;
  price: number | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string | null;
  gender: Gender | null;
  lat: number | null;
  lon: number | null;
  place: string | null;
}

export interface WearLog {
  id: string;
  itemIds: string[];
  wornOn: string;
}

export interface Want {
  id: string;
  kind: "check" | "archetype";
  imageKey: string | null;
  tags: ItemTags;
  label: string | null;
  createdAt: string;
}

export interface Weather {
  tempMax: number;
  tempMin: number;
  rain: number;
  code: number;
}

export function subLabel(category: Category, sub: string): string {
  return SUBCATEGORIES[category].find((s) => s.id === sub)?.label ?? CATEGORY_LABEL[category];
}

export function subsFor(category: Category, gender: Gender | null): SubDef[] {
  return SUBCATEGORIES[category].filter((s) => !s.only || !gender || gender === "all" || s.only === gender);
}

export function isItemTags(v: unknown): v is ItemTags {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    CATEGORIES.includes(t.category as Category) &&
    typeof t.subcategory === "string" &&
    typeof t.color === "string" &&
    /^#[0-9a-fA-F]{6}$/.test(t.color) &&
    PATTERNS.includes(t.pattern as Pattern) &&
    FITS.includes(t.fit as Fit) &&
    typeof t.formality === "number" &&
    typeof t.warmth === "number" &&
    Array.isArray(t.seasons) &&
    t.seasons.every((s) => SEASONS.includes(s as Season))
  );
}

export function clampTags(t: ItemTags): ItemTags {
  const clamp = (n: number) => Math.min(5, Math.max(1, Math.round(n)));
  const subs = SUBCATEGORIES[t.category];
  return {
    ...t,
    subcategory: subs.some((s) => s.id === t.subcategory) ? t.subcategory : subs[0].id,
    color: t.color.toUpperCase(),
    formality: clamp(t.formality),
    warmth: clamp(t.warmth),
    seasons: t.seasons.length ? [...new Set(t.seasons)] : [...SEASONS],
  };
}
