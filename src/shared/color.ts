export interface Lab {
  L: number;
  a: number;
  b: number;
}

export function hexToRgb(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function srgbToLinear(c: number): number {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function rgbToLab(r: number, g: number, b: number): Lab {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function hexToLab(hex: string): Lab {
  return rgbToLab(...hexToRgb(hex));
}

/** CIE76 色差 */
export function deltaE(a: Lab, b: Lab): number {
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b);
}

export function chroma(l: Lab): number {
  return Math.hypot(l.a, l.b);
}

export function hue(l: Lab): number {
  const h = (Math.atan2(l.b, l.a) * 180) / Math.PI;
  return h < 0 ? h + 360 : h;
}

export function hueDiff(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
}

/** 無彩色・ベージュ・ネイビー・デニムなど、何にでも合わせやすい色 */
export function isNeutral(hex: string): boolean {
  const l = hexToLab(hex);
  const c = chroma(l);
  const h = hue(l);
  if (c < 12) return true;
  if (l.L > 55 && c < 28 && h > 40 && h < 100) return true; // ベージュ・生成り
  if (l.L < 35 && c < 40 && h > 230 && h < 300) return true; // ネイビー
  if (l.L < 60 && c < 35 && h > 220 && h < 290) return true; // デニム
  if (l.L < 45 && c < 30 && h > 40 && h < 110) return true; // ブラウン・カーキ・オリーブ
  return false;
}

const NAMED: [string, string][] = [
  ["白", "#F5F5F2"],
  ["生成り", "#EDE6D6"],
  ["黒", "#1C1C1C"],
  ["チャコール", "#3E3E42"],
  ["グレー", "#9A9A9A"],
  ["ライトグレー", "#C9C9C9"],
  ["ネイビー", "#1F2A44"],
  ["インディゴ", "#2F4A6D"],
  ["ブルー", "#2F6FD6"],
  ["水色", "#A9C6E3"],
  ["ベージュ", "#D8C7A8"],
  ["ブラウン", "#6B4A32"],
  ["キャメル", "#B8864B"],
  ["カーキ", "#8A7F5A"],
  ["オリーブ", "#5E6B3A"],
  ["グリーン", "#2E7D4F"],
  ["ミント", "#A8D8C2"],
  ["イエロー", "#E8C547"],
  ["オレンジ", "#E07B39"],
  ["レッド", "#C23B32"],
  ["ボルドー", "#6E1F2E"],
  ["ピンク", "#E8A6B8"],
  ["パープル", "#6E4C9E"],
  ["ラベンダー", "#BCA9D9"],
];
const NAMED_LAB = NAMED.map(([n, h]) => [n, hexToLab(h)] as const);

export function colorName(hex: string): string {
  const l = hexToLab(hex);
  let best = NAMED_LAB[0];
  let bestD = Number.POSITIVE_INFINITY;
  for (const e of NAMED_LAB) {
    const d = deltaE(l, e[1]);
    if (d < bestD) {
      bestD = d;
      best = e;
    }
  }
  return best[0];
}

/** 一覧の色順ソート用キー（無彩色は明度順で先頭、それ以外は色相順） */
export function colorSortKey(hex: string): number {
  const l = hexToLab(hex);
  if (chroma(l) < 12) return 100 - l.L;
  return 1000 + hue(l);
}
