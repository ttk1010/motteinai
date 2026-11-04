import {
  clampTags,
  FITS,
  type ItemTags,
  isItemTags,
  PATTERNS,
  SEASONS,
  SUBCATEGORIES,
} from "../src/shared/types";

const subList = Object.entries(SUBCATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.map((s) => s.id).join(", ")}`)
  .join("\n");

const SYSTEM = `You are a fashion cataloguing assistant. Look at the single clothing item in the photo and return ONLY a JSON object with these keys:
- category: one of top, bottom, outer, onepiece, shoes
- subcategory: one id from the list for that category:
${subList}
- color: the main colour of the garment (not the background) as #RRGGBB
- pattern: one of ${PATTERNS.join(", ")}
- fit: one of ${FITS.join(", ")}
- formality: integer 1 (very casual) to 5 (formal)
- warmth: integer 1 (very thin, summer) to 5 (very warm, winter)
- seasons: array of the seasons it suits, from ${SEASONS.join(", ")}
Cardigans count as "top". Hoodies are "top". If several garments are visible, describe the most prominent one.`;

const SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: Object.keys(SUBCATEGORIES) },
    subcategory: { type: "string" },
    color: { type: "string" },
    pattern: { type: "string", enum: [...PATTERNS] },
    fit: { type: "string", enum: [...FITS] },
    formality: { type: "integer" },
    warmth: { type: "integer" },
    seasons: { type: "array", items: { type: "string", enum: [...SEASONS] } },
  },
  required: ["category", "subcategory", "color", "pattern", "fit", "formality", "warmth", "seasons"],
};

function toBase64(bytes: Uint8Array) {
  let s = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) s += String.fromCharCode(...bytes.subarray(i, i + chunk));
  return btoa(s);
}

function parse(raw: unknown): unknown {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") return null;
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/** モック：ローカル確認用。画像の中身ではなくバイト列から決定的にタグを作る */
function mockTags(bytes: Uint8Array, color: string | null): ItemTags {
  let h = 0;
  for (let i = 0; i < bytes.length; i += 997) h = (h * 31 + bytes[i]) >>> 0;
  const cats = ["top", "top", "bottom", "bottom", "outer", "shoes"] as const;
  const category = cats[h % cats.length];
  const subs = SUBCATEGORIES[category];
  return clampTags({
    category,
    subcategory: subs[(h >>> 3) % subs.length].id,
    color: color ?? "#9A9A9A",
    pattern: (h >>> 5) % 5 === 0 ? "stripe" : "solid",
    fit: FITS[(h >>> 7) % 3],
    formality: 1 + ((h >>> 9) % 4),
    warmth: category === "outer" ? 4 : 1 + ((h >>> 11) % 3),
    seasons: [...SEASONS],
  });
}

export async function tagImage(
  env: Env,
  bytes: Uint8Array,
  mime: string,
  measuredColor: string | null,
): Promise<ItemTags | null> {
  if (env.MOCK_AI === "1") return mockTags(bytes, measuredColor);
  try {
    const res = (await env.AI.run(
      env.VISION_MODEL as keyof AiModels,
      {
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: "Catalogue this item." },
              { type: "image_url", image_url: { url: `data:${mime};base64,${toBase64(bytes)}` } },
            ],
          },
        ],
        response_format: { type: "json_schema", json_schema: SCHEMA },
        max_tokens: 300,
        temperature: 0.1,
      } as never,
    )) as { response?: unknown };
    const parsed = parse(res?.response) as Record<string, unknown> | null;
    if (!parsed) return null;
    // 色は画素から測った値を優先する（AIの色は背景に引っ張られやすい）
    if (measuredColor) parsed.color = measuredColor;
    if (typeof parsed.color === "string" && !/^#[0-9a-fA-F]{6}$/.test(parsed.color))
      parsed.color = measuredColor ?? "#9A9A9A";
    if (!isItemTags(parsed)) return null;
    return clampTags(parsed);
  } catch (e) {
    console.error("tagImage failed", e);
    return null;
  }
}
