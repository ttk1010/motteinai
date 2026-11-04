/**
 * 組み合わせ・類似度・判定のルールエンジン。
 * AIに頼らず決定的に計算することで、画面に出す数字（＋N通り、似ている%）の根拠を一貫させる。
 */
import { chroma, deltaE, hexToLab, hue, hueDiff, isNeutral } from "./color";
import type { Category, ItemTags, Season, Weather } from "./types";

export type Piece = ItemTags & { id: string; wearCount?: number; lastWornAt?: string | null };

/** これ以上の点数の組み合わせを「成り立つコーデ」とみなす */
export const OUTFIT_THRESHOLD = 0.6;
export const SIMILAR_WARN = 0.7;
export const SIMILAR_SAME = 0.85;

const labCache = new Map<string, ReturnType<typeof hexToLab>>();
function lab(hex: string) {
  let v = labCache.get(hex);
  if (!v) {
    v = hexToLab(hex);
    labCache.set(hex, v);
  }
  return v;
}

const neutralCache = new Map<string, boolean>();
function neutral(hex: string) {
  let v = neutralCache.get(hex);
  if (v === undefined) {
    v = isNeutral(hex);
    neutralCache.set(hex, v);
  }
  return v;
}

/* ───────── 類似度 ───────── */

export function similarity(a: ItemTags, b: ItemTags): number {
  if (a.category !== b.category) return 0;
  const sub = a.subcategory === b.subcategory ? 1 : 0.3;
  const col = Math.max(0, 1 - deltaE(lab(a.color), lab(b.color)) / 35);
  const pat = a.pattern === b.pattern ? 1 : 0.2;
  const form = 1 - Math.abs(a.formality - b.formality) / 4;
  const fit = a.fit === b.fit ? 1 : 0.5;
  return 0.25 * sub + 0.5 * col + 0.1 * pat + 0.1 * form + 0.05 * fit;
}

export function mostSimilar<T extends Piece>(target: ItemTags, items: T[], n = 3) {
  return items
    .map((item) => ({ item, score: similarity(target, item) }))
    .filter((x) => x.score > 0.45)
    .sort((x, y) => y.score - x.score)
    .slice(0, n);
}

/* ───────── 相性 ───────── */

function colorHarmony(a: string, b: string): number {
  const na = neutral(a);
  const nb = neutral(b);
  if (na || nb) {
    if (na && nb) return deltaE(lab(a), lab(b)) < 6 ? 0.85 : 1;
    return 1;
  }
  const la = lab(a);
  const lb = lab(b);
  const d = hueDiff(hue(la), hue(lb));
  if (d < 25) return 0.85;
  const vivid = chroma(la) > 50 && chroma(lb) > 50;
  if (d > 150) return vivid ? 0.45 : 0.65;
  return vivid ? 0.25 : 0.4;
}

function seasonsOverlap(a: Season[], b: Season[]) {
  return a.some((s) => b.includes(s));
}

export function pairScore(a: ItemTags, b: ItemTags): number {
  if (a.category === b.category) return 0;
  if (!seasonsOverlap(a.seasons, b.seasons)) return 0;
  const col = colorHarmony(a.color, b.color);
  const form = Math.max(0, 1 - Math.abs(a.formality - b.formality) * 0.3);
  const bothPattern = a.pattern !== "solid" && b.pattern !== "solid";
  const pat = bothPattern ? 0.35 : 1;
  const isTopBottom =
    (a.category === "top" && b.category === "bottom") || (a.category === "bottom" && b.category === "top");
  const fit = isTopBottom && a.fit === "loose" && b.fit === "loose" ? 0.8 : 1;
  return col * form * pat * fit;
}

export function outfitScore(pieces: ItemTags[]): number {
  if (pieces.length < 2) return pieces.length === 1 ? 1 : 0;
  let logSum = 0;
  let n = 0;
  for (let i = 0; i < pieces.length; i++) {
    for (let j = i + 1; j < pieces.length; j++) {
      const s = pairScore(pieces[i], pieces[j]);
      if (s === 0) return 0;
      logSum += Math.log(s);
      n++;
    }
  }
  let score = Math.exp(logSum / n);
  // 有彩色が3系統以上になると散らかる
  const hues: number[] = [];
  for (const p of pieces) {
    if (neutral(p.color)) continue;
    const h = hue(lab(p.color));
    if (!hues.some((x) => hueDiff(x, h) < 25)) hues.push(h);
  }
  if (hues.length > 2) score *= 0.7;
  const patterns = pieces.filter((p) => p.pattern !== "solid").length;
  if (patterns > 1) score *= 0.6;
  return score;
}

/* ───────── コーデの数え方 ───────── */

/** コーデの芯：トップス＋ボトムス、またはワンピース */
export type Core<T extends Piece = Piece> = { pieces: T[]; score: number };

export function validCores<T extends Piece>(items: T[]): Core<T>[] {
  const tops = items.filter((i) => i.category === "top");
  const bottoms = items.filter((i) => i.category === "bottom");
  const cores: Core<T>[] = [];
  for (const t of tops) {
    for (const b of bottoms) {
      const score = pairScore(t, b);
      if (score >= OUTFIT_THRESHOLD) cores.push({ pieces: [t, b], score });
    }
  }
  for (const o of items) if (o.category === "onepiece") cores.push({ pieces: [o], score: 1 });
  return cores;
}

/**
 * そのアイテムを使って成り立つコーデの数。
 * トップス／ボトムス／ワンピースは「芯」の数、アウター／シューズは合わせられる芯の数。
 */
export function outfitCountWith(target: Piece, others: Piece[]): number {
  const pool = others.filter((o) => o.id !== target.id);
  switch (target.category as Category) {
    case "top":
      return pool.filter((b) => b.category === "bottom" && pairScore(target, b) >= OUTFIT_THRESHOLD).length;
    case "bottom":
      return pool.filter((t) => t.category === "top" && pairScore(t, target) >= OUTFIT_THRESHOLD).length;
    case "onepiece":
      return (
        1 + pool.filter((o) => o.category === "outer" && pairScore(target, o) >= OUTFIT_THRESHOLD).length
      );
    default:
      return validCores(pool).filter((c) => outfitScore([...c.pieces, target]) >= OUTFIT_THRESHOLD).length;
  }
}

/** 手持ちの中で、他のどれとも組めないアイテム */
export function orphanIds(items: Piece[]): Set<string> {
  const res = new Set<string>();
  for (const it of items) {
    if (it.category === "onepiece") continue;
    if (outfitCountWith(it, items) === 0) res.add(it.id);
  }
  return res;
}

/** そのアイテムと合う手持ち（カテゴリ別） */
export function matchesFor<T extends Piece>(target: ItemTags, items: T[]): T[] {
  return items
    .filter((i) => i.category !== target.category && pairScore(target, i) >= OUTFIT_THRESHOLD)
    .sort((a, b) => pairScore(target, b) - pairScore(target, a));
}

/* ───────── 買う前チェック ───────── */

export type Verdict = "buy" | "hold" | "skip";

export interface CheckResult<T extends Piece> {
  verdict: Verdict;
  gain: number;
  similar: { item: T; score: number }[];
  matches: T[];
  rescued: T[];
  examples: T[][];
  totalOutfits: number;
}

/** 「買い」と言える増え方。手持ちが少ないうちは、組める相手の半分以上で可 */
export function gainThreshold(totalOutfits: number, possible: number) {
  const base = Math.max(3, Math.round(totalOutfits * 0.05));
  return Math.max(1, Math.min(base, Math.ceil(possible * 0.5)));
}

function possiblePartners(category: Category, items: Piece[]): number {
  const count = (c: Category) => items.filter((i) => i.category === c).length;
  if (category === "top") return count("bottom");
  if (category === "bottom") return count("top");
  if (category === "onepiece") return 1 + count("outer");
  return validCores(items).length;
}

export function checkCandidate<T extends Piece>(candidate: ItemTags, items: T[]): CheckResult<T> {
  const cand: Piece = { ...candidate, id: "__candidate__" };
  const gain = outfitCountWith(cand, items);
  const similar = mostSimilar(candidate, items, 3);
  const matches = matchesFor(candidate, items);
  const orphans = orphanIds(items);
  const rescued = matches.filter((m) => orphans.has(m.id));
  const totalOutfits = validCores(items).length;
  const maxSim = similar[0]?.score ?? 0;

  let verdict: Verdict = "hold";
  if (maxSim >= SIMILAR_SAME) verdict = "skip";
  else if (
    gain >= gainThreshold(totalOutfits, possiblePartners(candidate.category, items)) &&
    maxSim < SIMILAR_WARN
  )
    verdict = "buy";
  else if (gain === 0) verdict = "skip";

  return {
    verdict,
    gain,
    similar,
    matches,
    rescued,
    examples: exampleOutfits(cand, items, 3) as T[][],
    totalOutfits,
  };
}

/** 候補を含むコーデ例（候補は先頭以外の位置にも入る） */
export function exampleOutfits(target: Piece, items: Piece[], n: number): Piece[][] {
  const pool = items.filter((i) => i.id !== target.id);
  const all = [...pool, target];
  const cores = validCores(all).filter((c) => c.pieces.some((p) => p.id === target.id));
  let outfits: { pieces: Piece[]; score: number }[];
  if (cores.length) {
    outfits = cores.map((c) => {
      const extra = bestAddon(c.pieces, pool, "shoes");
      const pieces = extra ? [...c.pieces, extra] : c.pieces;
      return { pieces, score: outfitScore(pieces) };
    });
  } else {
    outfits = validCores(pool)
      .map((c) => ({ pieces: [...c.pieces, target], score: outfitScore([...c.pieces, target]) }))
      .filter((o) => o.score >= OUTFIT_THRESHOLD);
  }
  return pickDiverse(outfits, n).map((o) => o.pieces);
}

function bestAddon(pieces: Piece[], pool: Piece[], category: Category): Piece | null {
  let best: Piece | null = null;
  let bestScore = OUTFIT_THRESHOLD;
  for (const p of pool) {
    if (p.category !== category) continue;
    const s = outfitScore([...pieces, p]);
    if (s > bestScore) {
      best = p;
      bestScore = s;
    }
  }
  return best;
}

function pickDiverse<O extends { pieces: Piece[]; score: number }>(outfits: O[], n: number): O[] {
  const sorted = [...outfits].sort((a, b) => b.score - a.score);
  const picked: O[] = [];
  const used = new Map<string, number>();
  while (picked.length < n && sorted.length) {
    let bestIdx = 0;
    let bestVal = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < sorted.length; i++) {
      const overlap = sorted[i].pieces.reduce((s, p) => s + (used.get(p.id) ?? 0), 0);
      const val = sorted[i].score - overlap * 0.25;
      if (val > bestVal) {
        bestVal = val;
        bestIdx = i;
      }
    }
    const [o] = sorted.splice(bestIdx, 1);
    picked.push(o);
    for (const p of o.pieces) used.set(p.id, (used.get(p.id) ?? 0) + 1);
  }
  return picked;
}

/* ───────── 今日のコーデ ───────── */

export function seasonOf(date: Date): Season {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export function targetWarmth(w: Weather): number {
  const t = (w.tempMax + w.tempMin) / 2;
  if (t >= 25) return 1;
  if (t >= 20) return 2;
  if (t >= 14) return 3;
  if (t >= 8) return 4;
  return 5;
}

export function needsOuter(w: Weather) {
  return w.tempMax < 20;
}

export interface DailyOutfit<T extends Piece> {
  pieces: T[];
  score: number;
  usesUnworn: boolean;
}

export interface DailyOptions {
  weather: Weather;
  today: Date;
  /** 直近に着た日付（YYYY-MM-DD）ごとのアイテムID */
  recent: { wornOn: string; itemIds: string[] }[];
}

export function dailyOutfits<T extends Piece>(items: T[], opts: DailyOptions, n = 3): DailyOutfit<T>[] {
  const season = seasonOf(opts.today);
  const tw = targetWarmth(opts.weather);
  const dayMs = 86400000;
  const lastWorn = new Map<string, number>();
  const recentCores = new Set<string>();
  for (const r of opts.recent) {
    const days = Math.floor((opts.today.getTime() - new Date(r.wornOn).getTime()) / dayMs);
    for (const id of r.itemIds) lastWorn.set(id, Math.min(lastWorn.get(id) ?? 99, days));
    if (days <= 7) recentCores.add([...r.itemIds].sort().join("|"));
  }

  const warmthFit = (p: Piece) => {
    const d = Math.abs(p.warmth - tw);
    return d <= 1 ? 1 : d === 2 ? 0.7 : 0.4;
  };
  const freshness = (p: Piece) => {
    const days = lastWorn.get(p.id);
    let f = days !== undefined && days <= 2 ? 0.75 : 1;
    if (!p.wearCount) f *= 1.08;
    if (!p.seasons.includes(season)) f *= 0.5;
    return f;
  };

  const pool = items.filter((i) => i.category !== "outer" && i.category !== "shoes");
  const outers = items.filter((i) => i.category === "outer");
  const shoes = items.filter((i) => i.category === "shoes");
  const wantOuter = needsOuter(opts.weather);

  const candidates: DailyOutfit<T>[] = [];
  for (const core of validCores(pool)) {
    let pieces = [...core.pieces];
    let score = core.score;
    for (const p of pieces) score *= warmthFit(p) * freshness(p);
    if (wantOuter && outers.length) {
      let best: T | null = null;
      let bestS = 0;
      for (const o of outers) {
        const s = outfitScore([...pieces, o]) * warmthFit(o) * freshness(o);
        if (s > bestS) {
          best = o;
          bestS = s;
        }
      }
      if (best) {
        pieces = [...pieces, best];
        score = (score + bestS) / 2;
      }
    }
    const shoe = bestAddon(pieces, shoes, "shoes") as T | null;
    if (shoe) pieces = [...pieces, shoe];
    if (
      recentCores.has(
        core.pieces
          .map((p) => p.id)
          .sort()
          .join("|"),
      )
    )
      score *= 0.5;
    candidates.push({ pieces, score, usesUnworn: core.pieces.some((p) => !p.wearCount) });
  }

  const picked = pickDiverse(candidates, n);
  // 3案のうち1案は出番のない服を使う
  if (picked.length === n && !picked.some((p) => p.usesUnworn)) {
    const alt = candidates
      .filter((c) => c.usesUnworn && !picked.includes(c))
      .sort((a, b) => b.score - a.score)[0];
    if (alt) picked[n - 1] = alt;
  }
  return picked;
}

/** コーデの1枠を、次に点数が高い別のアイテムへ入れ替える */
export function swapPiece<T extends Piece>(outfit: T[], index: number, items: T[], seen: Set<string>): T[] {
  const current = outfit[index];
  const rest = outfit.filter((_, i) => i !== index);
  const options = items
    .filter((i) => i.category === current.category && i.id !== current.id)
    .map((i) => ({ i, s: outfitScore([...rest, i]) }))
    .filter((x) => x.s >= OUTFIT_THRESHOLD * 0.9)
    .sort((a, b) => b.s - a.s);
  if (!options.length) return outfit;
  // まだ出していない候補を優先し、一周したら最初に戻る
  const pick = options.find((o) => !seen.has(o.i.id)) ?? options[0];
  if (!options.some((o) => !seen.has(o.i.id))) seen.clear();
  seen.add(current.id);
  const next = [...outfit];
  next[index] = pick.i;
  return next;
}
