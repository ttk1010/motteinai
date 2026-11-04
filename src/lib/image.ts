import { rgbToHex, rgbToLab } from "../shared/color";

export interface Prepared {
  blob: Blob;
  color: string;
  previewUrl: string;
}

const MAX_SIDE = 1280;

async function decode(src: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(src, { imageOrientation: "from-image" });
    } catch {}
  }
  const url = URL.createObjectURL(src);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** 送る前に縮小・圧縮し、服の主色を測る */
export async function prepareImage(src: Blob | HTMLCanvasElement): Promise<Prepared> {
  let source: CanvasImageSource;
  let w: number;
  let h: number;
  if (src instanceof HTMLCanvasElement) {
    source = src;
    w = src.width;
    h = src.height;
  } else {
    const img = await decode(src);
    source = img;
    w = img.width;
    h = img.height;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const color = dominantColor(canvas);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/jpeg", 0.86),
  );
  return { blob, color, previewUrl: URL.createObjectURL(blob) };
}

/**
 * 主色の推定：縁の平均色を背景とみなし、中央付近で背景と離れた画素の
 * 最も多い色の塊を服の色とする。
 */
export function dominantColor(canvas: HTMLCanvasElement): string {
  const S = 64;
  const small = document.createElement("canvas");
  small.width = S;
  small.height = S;
  const ctx = small.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "#9A9A9A";
  ctx.drawImage(canvas, 0, 0, S, S);
  const { data } = ctx.getImageData(0, 0, S, S);
  const px = (x: number, y: number) => {
    const i = (y * S + x) * 4;
    return [data[i], data[i + 1], data[i + 2], data[i + 3]] as const;
  };

  let br = 0;
  let bg = 0;
  let bb = 0;
  let bn = 0;
  for (let i = 0; i < S; i++) {
    for (const [x, y] of [
      [i, 0],
      [i, S - 1],
      [0, i],
      [S - 1, i],
    ]) {
      const [r, g, b] = px(x, y);
      br += r;
      bg += g;
      bb += b;
      bn++;
    }
  }
  const bgLab = rgbToLab(br / bn, bg / bn, bb / bn);

  const buckets = new Map<number, { r: number; g: number; b: number; n: number }>();
  const lo = Math.floor(S * 0.15);
  const hi = Math.ceil(S * 0.85);
  let total = 0;
  for (let y = lo; y < hi; y++) {
    for (let x = lo; x < hi; x++) {
      const [r, g, b, a] = px(x, y);
      if (a < 128) continue;
      const l = rgbToLab(r, g, b);
      const d = Math.hypot(l.L - bgLab.L, l.a - bgLab.a, l.b - bgLab.b);
      if (d < 14) continue;
      const key = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
      const e = buckets.get(key) ?? { r: 0, g: 0, b: 0, n: 0 };
      e.r += r;
      e.g += g;
      e.b += b;
      e.n++;
      buckets.set(key, e);
      total++;
    }
  }
  if (total < 40) {
    // 背景と見分けがつかない場合は中央の平均
    let r = 0;
    let g = 0;
    let b = 0;
    let n = 0;
    for (let y = S / 2 - 8; y < S / 2 + 8; y++)
      for (let x = S / 2 - 8; x < S / 2 + 8; x++) {
        const p = px(x, y);
        r += p[0];
        g += p[1];
        b += p[2];
        n++;
      }
    return rgbToHex(r / n, g / n, b / n);
  }
  let best = { r: 0, g: 0, b: 0, n: 0 };
  for (const e of buckets.values()) if (e.n > best.n) best = e;
  return rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n);
}

export function vibrate(ms = 10) {
  try {
    navigator.vibrate?.(ms);
  } catch {}
}
