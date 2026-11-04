import { describe, expect, it } from "vitest";
import { recommend } from "../src/shared/archetypes";
import { isNeutral } from "../src/shared/color";
import {
  checkCandidate,
  dailyOutfits,
  orphanIds,
  outfitCountWith,
  type Piece,
  pairScore,
  similarity,
  validCores,
} from "../src/shared/engine";
import type { ItemTags } from "../src/shared/types";

const base: Omit<ItemTags, "category" | "subcategory" | "color"> = {
  pattern: "solid",
  fit: "regular",
  formality: 2,
  warmth: 2,
  seasons: ["spring", "summer", "autumn", "winter"],
};
let n = 0;
const p = (
  category: ItemTags["category"],
  subcategory: string,
  color: string,
  extra: Partial<ItemTags> = {},
): Piece => ({
  ...base,
  category,
  subcategory,
  color,
  ...extra,
  id: `i${n++}`,
});

const whiteTee = p("top", "tshirt", "#F5F5F2");
const navyShirt = p("top", "shirt", "#1F2A44", { formality: 3 });
const pinkKnit = p("top", "knit", "#E8A6B8", { formality: 3 });
const denim = p("bottom", "denim", "#2F4A6D");
const blackSlacks = p("bottom", "slacks", "#1C1C1C", { formality: 4 });
const greenCargo = p("bottom", "cargo", "#2E7D4F", { formality: 1 });
const sneaker = p("shoes", "sneaker", "#F5F5F2", { formality: 1 });
const wardrobe = [whiteTee, navyShirt, pinkKnit, denim, blackSlacks, greenCargo, sneaker];

describe("color", () => {
  it("ネイビー・ベージュ・白黒は合わせやすい色", () => {
    for (const c of ["#1F2A44", "#D8C7A8", "#FFFFFF", "#111111", "#2F4A6D"]) expect(isNeutral(c)).toBe(true);
    for (const c of ["#E8A6B8", "#2E7D4F", "#C23B32"]) expect(isNeutral(c)).toBe(false);
  });
});

describe("similarity", () => {
  it("同じ白Tはほぼ同じ", () => {
    expect(similarity(whiteTee, p("top", "tshirt", "#F2F2EE"))).toBeGreaterThanOrEqual(0.85);
  });
  it("白Tと黒Tは似ていない扱い", () => {
    expect(similarity(whiteTee, p("top", "tshirt", "#1C1C1C"))).toBeLessThan(0.7);
  });
  it("カテゴリが違えば0", () => {
    expect(similarity(whiteTee, denim)).toBe(0);
  });
});

describe("pairScore", () => {
  it("白T×デニムは成り立つ", () => {
    expect(pairScore(whiteTee, denim)).toBeGreaterThanOrEqual(0.6);
  });
  it("ピンクのニット×グリーンのカーゴは成り立たない", () => {
    expect(pairScore(pinkKnit, greenCargo)).toBeLessThan(0.6);
  });
  it("季節が重ならないと0", () => {
    const summer = p("top", "tank", "#F5F5F2", { seasons: ["summer"] });
    const winter = p("bottom", "wide", "#1C1C1C", { seasons: ["winter"] });
    expect(pairScore(summer, winter)).toBe(0);
  });
});

describe("counts", () => {
  it("芯の数と、アイテムごとの数が整合する", () => {
    const cores = validCores(wardrobe);
    const fromTops = wardrobe
      .filter((i) => i.category === "top")
      .reduce((s, t) => s + outfitCountWith(t, wardrobe), 0);
    expect(fromTops).toBe(cores.length);
  });
  it("どれとも組めない服を見つける", () => {
    expect(orphanIds([pinkKnit, greenCargo, denim]).has(greenCargo.id)).toBe(true);
    expect(orphanIds([pinkKnit, greenCargo, denim]).has(pinkKnit.id)).toBe(false);
  });
});

describe("checkCandidate", () => {
  it("ほぼ同じ物を持っていれば見送り", () => {
    const r = checkCandidate({ ...whiteTee }, wardrobe);
    expect(r.verdict).toBe("skip");
    expect(r.similar[0].item.id).toBe(whiteTee.id);
  });
  it("組める数が多く、似ていなければ買い", () => {
    const r = checkCandidate(
      { ...base, category: "top", subcategory: "knit", color: "#9A9A9A", formality: 3 },
      wardrobe,
    );
    expect(r.gain).toBeGreaterThanOrEqual(2);
    expect(r.verdict).toBe("buy");
  });
});

describe("recommend", () => {
  it("手持ちと似ている候補は出さない", () => {
    const recs = recommend(wardrobe, { gender: "mens", today: new Date("2026-11-04"), limit: 5 });
    expect(recs.length).toBe(5);
    for (const r of recs) expect(r.archetype.label).not.toBe("白のTシャツ");
  });
  it("スカートはメンズに出さない", () => {
    const recs = recommend([], { gender: "mens", today: new Date("2026-11-04"), limit: 30 });
    expect(recs.some((r) => r.archetype.subcategory === "skirt")).toBe(false);
  });
});

describe("dailyOutfits", () => {
  it("寒い日はアウターを足す", () => {
    const coat = p("outer", "coat", "#3E3E42", { warmth: 5, formality: 3, seasons: ["winter", "autumn"] });
    const res = dailyOutfits([...wardrobe, coat], {
      weather: { tempMax: 12, tempMin: 4, rain: 0, code: 0 },
      today: new Date("2026-11-04"),
      recent: [],
    });
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].pieces.some((x) => x.category === "outer")).toBe(true);
  });
});
