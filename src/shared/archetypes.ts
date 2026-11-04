/**
 * 「買うと良い服」の候補にする定番アイテムの見本集。
 * 特定ブランドの商品ではなく、カテゴリ×色×柄×きちんと度の組み合わせ。
 */
import { colorName } from "./color";
import {
  matchesFor,
  mostSimilar,
  orphanIds,
  outfitCountWith,
  type Piece,
  SIMILAR_WARN,
  seasonOf,
} from "./engine";
import { type Category, type Fit, type Gender, type ItemTags, type Season, subLabel, subsFor } from "./types";

export interface Archetype extends ItemTags {
  id: string;
  label: string;
}

const C = {
  white: "#F5F5F2",
  black: "#1C1C1C",
  gray: "#9A9A9A",
  charcoal: "#3E3E42",
  navy: "#1F2A44",
  beige: "#D8C7A8",
  brown: "#6B4A32",
  khaki: "#8A7F5A",
  olive: "#5E6B3A",
  lightblue: "#A9C6E3",
  indigo: "#2F4A6D",
  lightdenim: "#7E9CC0",
  camel: "#B8864B",
};

const ALL: Season[] = ["spring", "summer", "autumn", "winter"];
const SSA: Season[] = ["spring", "summer", "autumn"];
const SAW: Season[] = ["spring", "autumn", "winter"];
const AW: Season[] = ["autumn", "winter"];
const SA: Season[] = ["spring", "autumn"];
const SU: Season[] = ["spring", "summer"];

type Spec = [Category, string, string[], number, number, Fit, Season[]];

const SPECS: Spec[] = [
  ["top", "tshirt", ["white", "black", "gray", "navy", "beige"], 1, 1, "regular", SSA],
  ["top", "longtee", ["white", "black", "gray", "navy"], 1, 2, "regular", SAW],
  ["top", "shirt", ["white", "lightblue", "navy", "beige"], 3, 2, "regular", ALL],
  ["top", "blouse", ["white", "beige", "black"], 3, 2, "regular", SSA],
  ["top", "polo", ["white", "navy", "black"], 2, 1, "regular", SU],
  ["top", "knit", ["gray", "navy", "beige", "black", "brown", "white"], 3, 4, "regular", AW],
  ["top", "sweat", ["gray", "navy", "white", "black"], 1, 3, "loose", SAW],
  ["top", "cardigan", ["navy", "gray", "beige", "black"], 2, 3, "regular", SAW],
  ["bottom", "denim", ["indigo", "lightdenim", "black"], 2, 3, "regular", ALL],
  ["bottom", "slacks", ["black", "gray", "navy", "beige", "charcoal"], 4, 2, "slim", ALL],
  ["bottom", "chino", ["beige", "navy", "khaki", "olive", "black"], 2, 2, "regular", SSA],
  ["bottom", "wide", ["black", "beige", "gray", "brown"], 3, 2, "loose", ALL],
  ["bottom", "skirt", ["black", "beige", "navy", "gray"], 3, 2, "regular", ALL],
  ["outer", "jacket", ["navy", "black", "gray", "beige"], 4, 3, "regular", SA],
  ["outer", "blouson", ["black", "olive", "navy", "beige"], 2, 3, "regular", SA],
  ["outer", "trench", ["beige", "navy", "black"], 3, 3, "regular", SA],
  ["outer", "coat", ["charcoal", "navy", "camel", "black"], 4, 5, "regular", ["winter"]],
  ["outer", "down", ["black", "navy", "olive"], 1, 5, "regular", ["winter"]],
  ["shoes", "sneaker", ["white", "black", "gray"], 1, 2, "regular", ALL],
  ["shoes", "leather", ["black", "brown"], 5, 3, "regular", ALL],
  ["shoes", "loafer", ["black", "brown"], 3, 3, "regular", ALL],
  ["shoes", "boots", ["black", "brown"], 3, 4, "regular", AW],
  ["shoes", "pumps", ["black", "beige"], 4, 2, "regular", ALL],
];

export const ARCHETYPES: Archetype[] = SPECS.flatMap(
  ([category, sub, colors, formality, warmth, fit, seasons]) =>
    colors.map((c) => {
      const color = C[c as keyof typeof C];
      return {
        id: `arch:${category}:${sub}:${c}`,
        label: `${colorName(color)}の${subLabel(category, sub)}`,
        category,
        subcategory: sub,
        color,
        pattern: "solid" as const,
        fit,
        formality,
        warmth,
        seasons,
      };
    }),
);

export interface Recommendation<T extends Piece> {
  archetype: Archetype;
  gain: number;
  matches: T[];
  rescued: T[];
}

export function recommend<T extends Piece>(
  items: T[],
  opts: { gender: Gender | null; today: Date; limit?: number },
): Recommendation<T>[] {
  const season = seasonOf(opts.today);
  const allowed = new Set(
    (["top", "bottom", "outer", "onepiece", "shoes"] as Category[]).flatMap((c) =>
      subsFor(c, opts.gender).map((s) => `${c}:${s.id}`),
    ),
  );
  const orphans = orphanIds(items);
  const hasCategory = (c: Category) => items.some((i) => i.category === c);

  const scored = ARCHETYPES.filter((a) => allowed.has(`${a.category}:${a.subcategory}`))
    .filter((a) => (mostSimilar(a, items, 1)[0]?.score ?? 0) < SIMILAR_WARN)
    .map((a) => {
      const piece: Piece = { ...a };
      const gain = outfitCountWith(piece, items);
      const matches = matchesFor(a, items);
      const rescued = matches.filter((m) => orphans.has(m.id));
      const seasonW = a.seasons.includes(season) ? 1 : 0.4;
      // 手持ちが少ないうちは、持っていないカテゴリを優先
      const missing = hasCategory(a.category) ? 0 : 4;
      const score = (gain + rescued.length * 2 + missing) * seasonW;
      return { archetype: a, gain, matches, rescued, score };
    })
    .sort((x, y) => y.score - x.score);

  // 同じ種類ばかりにならないよう、細かい種類ごとに1件まで
  const seen = new Set<string>();
  const out: Recommendation<T>[] = [];
  for (const s of scored) {
    const key = `${s.archetype.category}:${s.archetype.subcategory}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ archetype: s.archetype, gain: s.gain, matches: s.matches, rescued: s.rescued });
    if (out.length >= (opts.limit ?? 5)) break;
  }
  return out;
}
