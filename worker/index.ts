import { Hono } from "hono";
import { clampTags, type Gender, type Item, type ItemTags, isItemTags, type User } from "../src/shared/types";
import { tagImage } from "./ai";
import { type AuthVars, authRoutes, requireAuth } from "./auth";

type App = { Bindings: Env } & AuthVars;
const app = new Hono<App>();

const MAX_IMAGE = 8 * 1024 * 1024;

app.route("/auth", authRoutes);

const api = new Hono<App>();
api.use("*", requireAuth);

/* ───────── 変換 ───────── */

interface ItemRow {
  id: string;
  status: Item["status"];
  image_key: string;
  cutout_key: string | null;
  category: Item["category"];
  subcategory: string;
  color: string;
  pattern: Item["pattern"];
  fit: Item["fit"];
  formality: number;
  warmth: number;
  seasons: string;
  brand: string | null;
  price: number | null;
  wear_count: number;
  last_worn_at: string | null;
  created_at: string;
}

function toItem(r: ItemRow): Item {
  return {
    id: r.id,
    status: r.status,
    imageKey: r.image_key,
    cutoutKey: r.cutout_key,
    category: r.category,
    subcategory: r.subcategory,
    color: r.color,
    pattern: r.pattern,
    fit: r.fit,
    formality: r.formality,
    warmth: r.warmth,
    seasons: JSON.parse(r.seasons),
    brand: r.brand,
    price: r.price,
    wearCount: r.wear_count,
    lastWornAt: r.last_worn_at,
    createdAt: r.created_at,
  };
}

async function getItem(db: D1Database, userId: string, id: string) {
  const r = await db
    .prepare("SELECT * FROM items WHERE id = ? AND user_id = ?")
    .bind(id, userId)
    .first<ItemRow>();
  return r ? toItem(r) : null;
}

/* ───────── 画像 ───────── */

async function removeBackground(env: Env, bytes: Uint8Array): Promise<ArrayBuffer | null> {
  try {
    const stream = new Blob([bytes]).stream();
    const out = await env.IMAGES.input(stream)
      // segment: "foreground" は Cloudflare Images の背景切り抜き
      .transform({ segment: "foreground", width: 900 } as ImageTransform)
      .output({ format: "image/png" });
    const buf = await out.response().arrayBuffer();
    return buf.byteLength > 0 ? buf : null;
  } catch (e) {
    console.warn("background removal unavailable", e);
    return null;
  }
}

async function readImage(c: { req: { parseBody: () => Promise<Record<string, unknown>> } }) {
  const body = await c.req.parseBody();
  const file = body.image;
  if (!(file instanceof File)) return { error: "image required" as const };
  if (file.size > MAX_IMAGE) return { error: "image too large" as const };
  if (!file.type.startsWith("image/")) return { error: "not an image" as const };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const color =
    typeof body.color === "string" && /^#[0-9a-fA-F]{6}$/.test(body.color) ? body.color.toUpperCase() : null;
  let tags: ItemTags | null = null;
  if (typeof body.tags === "string") {
    try {
      const t = JSON.parse(body.tags);
      if (isItemTags(t)) tags = clampTags(t);
    } catch {}
  }
  return { bytes, mime: file.type, color, tags };
}

async function processItem(
  env: Env,
  userId: string,
  id: string,
  bytes: Uint8Array,
  mime: string,
  color: string | null,
  given: ItemTags | null,
) {
  const [cutout, tags] = await Promise.all([
    removeBackground(env, bytes),
    given ? Promise.resolve(given) : tagImage(env, bytes, mime, color),
  ]);
  let cutoutKey: string | null = null;
  if (cutout) {
    cutoutKey = `${userId}/${id}/cutout.png`;
    await env.BUCKET.put(cutoutKey, cutout, { httpMetadata: { contentType: "image/png" } });
  }
  const t = tags ?? (color ? { color } : {});
  const status = given ? "ready" : "review";
  const sets: string[] = ["status = ?", "cutout_key = ?"];
  const vals: unknown[] = [status, cutoutKey];
  for (const [k, v] of Object.entries(t)) {
    sets.push(`${k} = ?`);
    vals.push(k === "seasons" ? JSON.stringify(v) : v);
  }
  await env.DB.prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`)
    .bind(...vals, id, userId)
    .run();
}

api.get("/images/:uid/:id/:file", async (c) => {
  const { uid, id, file } = c.req.param();
  if (uid !== c.get("userId")) return c.notFound();
  const obj = await c.env.BUCKET.get(`${uid}/${id}/${file}`);
  if (!obj) return c.notFound();
  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "private, max-age=31536000, immutable",
      etag: obj.httpEtag,
    },
  });
});

/* ───────── ユーザー ───────── */

api.get("/me", async (c) => {
  const r = await c.env.DB.prepare(
    "SELECT id, name, email, picture, gender, lat, lon, place FROM users WHERE id = ?",
  )
    .bind(c.get("userId"))
    .first<User>();
  if (!r) return c.json({ error: "unauthorized" }, 401);
  return c.json(r);
});

api.patch("/me", async (c) => {
  const b = await c.req.json<{ gender?: Gender; lat?: number; lon?: number; place?: string }>();
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (b.gender && ["mens", "womens", "all"].includes(b.gender)) {
    sets.push("gender = ?");
    vals.push(b.gender);
  }
  if (
    typeof b.lat === "number" &&
    typeof b.lon === "number" &&
    Math.abs(b.lat) <= 90 &&
    Math.abs(b.lon) <= 180
  ) {
    sets.push("lat = ?", "lon = ?");
    vals.push(b.lat, b.lon);
  }
  if (typeof b.place === "string") {
    sets.push("place = ?");
    vals.push(b.place.slice(0, 60));
  }
  if (sets.length)
    await c.env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...vals, c.get("userId"))
      .run();
  return c.json({ ok: true });
});

api.delete("/me", async (c) => {
  const uid = c.get("userId");
  let cursor: string | undefined;
  do {
    const list = await c.env.BUCKET.list({ prefix: `${uid}/`, cursor });
    if (list.objects.length) await c.env.BUCKET.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  await c.env.DB.batch(
    ["wear_logs", "wants", "items", "sessions"]
      .map((t) => c.env.DB.prepare(`DELETE FROM ${t} WHERE user_id = ?`).bind(uid))
      .concat(c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(uid)),
  );
  return c.json({ ok: true });
});

api.get("/export", async (c) => {
  const uid = c.get("userId");
  const [items, wears, wants] = await Promise.all([
    c.env.DB.prepare("SELECT * FROM items WHERE user_id = ?").bind(uid).all<ItemRow>(),
    c.env.DB.prepare("SELECT id, item_ids, worn_on FROM wear_logs WHERE user_id = ?").bind(uid).all(),
    c.env.DB.prepare("SELECT id, kind, tags, label, created_at FROM wants WHERE user_id = ?").bind(uid).all(),
  ]);
  return c.json(
    {
      exportedAt: new Date().toISOString(),
      items: items.results.map(toItem),
      wears: wears.results,
      wants: wants.results,
    },
    200,
    { "content-disposition": 'attachment; filename="mottenai-export.json"' },
  );
});

/* ───────── アイテム ───────── */

api.get("/items", async (c) => {
  const r = await c.env.DB.prepare("SELECT * FROM items WHERE user_id = ? ORDER BY created_at DESC")
    .bind(c.get("userId"))
    .all<ItemRow>();
  return c.json(r.results.map(toItem));
});

api.post("/items", async (c) => {
  const img = await readImage(c);
  if ("error" in img) return c.json({ error: img.error }, 400);
  const uid = c.get("userId");
  const id = crypto.randomUUID();
  const ext = img.mime === "image/png" ? "png" : img.mime === "image/webp" ? "webp" : "jpg";
  const imageKey = `${uid}/${id}/original.${ext}`;
  await c.env.BUCKET.put(imageKey, img.bytes, { httpMetadata: { contentType: img.mime } });
  await c.env.DB.prepare(
    "INSERT INTO items (id, user_id, status, image_key, color) VALUES (?, ?, 'processing', ?, ?)",
  )
    .bind(id, uid, imageKey, img.color ?? "#9A9A9A")
    .run();
  // 重い処理は応答のあとに進める。ユーザーはすぐ次を撮れる
  c.executionCtx.waitUntil(
    processItem(c.env, uid, id, img.bytes, img.mime, img.color, img.tags).catch(async (e) => {
      console.error("processItem failed", e);
      await c.env.DB.prepare("UPDATE items SET status = 'review' WHERE id = ? AND user_id = ?")
        .bind(id, uid)
        .run();
    }),
  );
  const item = await getItem(c.env.DB, uid, id);
  return c.json(item, 201);
});

api.patch("/items/:id", async (c) => {
  const uid = c.get("userId");
  const id = c.req.param("id");
  const current = await getItem(c.env.DB, uid, id);
  if (!current) return c.notFound();
  const b = await c.req.json<
    Partial<ItemTags> & { status?: "ready"; brand?: string | null; price?: number | null }
  >();
  const merged = clampTags({ ...current, ...b } as ItemTags);
  if (!isItemTags(merged)) return c.json({ error: "invalid tags" }, 400);
  const status = b.status === "ready" ? "ready" : current.status;
  const brand = b.brand === undefined ? current.brand : b.brand?.slice(0, 60) || null;
  const price = b.price === undefined ? current.price : b.price && b.price > 0 ? Math.round(b.price) : null;
  await c.env.DB.prepare(
    `UPDATE items SET category = ?, subcategory = ?, color = ?, pattern = ?, fit = ?, formality = ?, warmth = ?, seasons = ?,
     status = ?, brand = ?, price = ? WHERE id = ? AND user_id = ?`,
  )
    .bind(
      merged.category,
      merged.subcategory,
      merged.color,
      merged.pattern,
      merged.fit,
      merged.formality,
      merged.warmth,
      JSON.stringify(merged.seasons),
      status,
      brand,
      price,
      id,
      uid,
    )
    .run();
  return c.json(await getItem(c.env.DB, uid, id));
});

api.delete("/items/:id", async (c) => {
  const uid = c.get("userId");
  const item = await getItem(c.env.DB, uid, c.req.param("id"));
  if (!item) return c.notFound();
  await c.env.DB.prepare("DELETE FROM items WHERE id = ? AND user_id = ?").bind(item.id, uid).run();
  await c.env.BUCKET.delete([item.imageKey, ...(item.cutoutKey ? [item.cutoutKey] : [])]);
  return c.json({ ok: true });
});

/** 買う前チェック用：保存せずにタグだけ付ける */
api.post("/analyze", async (c) => {
  const img = await readImage(c);
  if ("error" in img) return c.json({ error: img.error }, 400);
  const tags = await tagImage(c.env, img.bytes, img.mime, img.color);
  if (!tags) return c.json({ error: "analyze failed" }, 502);
  return c.json(tags);
});

/** ECの商品ページURLから商品画像を取ってくる */
api.post("/import-url", async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  let target: URL;
  try {
    target = new URL(url);
  } catch {
    return c.json({ error: "invalid url" }, 400);
  }
  if (!["http:", "https:"].includes(target.protocol)) return c.json({ error: "invalid url" }, 400);
  const fetchOpts = {
    headers: { "user-agent": "Mozilla/5.0 (compatible; MottenaiBot/1.0)" },
    signal: AbortSignal.timeout(8000),
  };
  try {
    let res = await fetch(target.toString(), fetchOpts);
    let type = res.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) {
      const html = (await res.text()).slice(0, 1_000_000);
      const m =
        html.match(
          /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
        ) ??
        html.match(
          /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
        );
      if (!m) return c.json({ error: "no image" }, 422);
      const imgUrl = new URL(m[1].replace(/&amp;/g, "&"), target);
      if (!["http:", "https:"].includes(imgUrl.protocol)) return c.json({ error: "no image" }, 422);
      res = await fetch(imgUrl.toString(), fetchOpts);
      type = res.headers.get("content-type") ?? "";
    }
    if (!res.ok || !type.startsWith("image/")) return c.json({ error: "no image" }, 422);
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_IMAGE * 2) return c.json({ error: "image too large" }, 413);
    return new Response(buf, { headers: { "content-type": type } });
  } catch {
    return c.json({ error: "fetch failed" }, 502);
  }
});

/* ───────── 着た記録 ───────── */

api.get("/wears", async (c) => {
  const days = Math.min(90, Number(c.req.query("days") ?? 30));
  const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const r = await c.env.DB.prepare(
    "SELECT id, item_ids, worn_on FROM wear_logs WHERE user_id = ? AND worn_on >= ? ORDER BY worn_on DESC",
  )
    .bind(c.get("userId"), since)
    .all<{ id: string; item_ids: string; worn_on: string }>();
  return c.json(r.results.map((w) => ({ id: w.id, itemIds: JSON.parse(w.item_ids), wornOn: w.worn_on })));
});

api.post("/wears", async (c) => {
  const uid = c.get("userId");
  const b = await c.req.json<{ itemIds: string[]; wornOn: string }>();
  if (!Array.isArray(b.itemIds) || !b.itemIds.length || !/^\d{4}-\d{2}-\d{2}$/.test(b.wornOn))
    return c.json({ error: "invalid" }, 400);
  const ids = b.itemIds.slice(0, 8).map(String);
  const id = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare("INSERT INTO wear_logs (id, user_id, item_ids, worn_on) VALUES (?, ?, ?, ?)").bind(
      id,
      uid,
      JSON.stringify(ids),
      b.wornOn,
    ),
    ...ids.map((iid) =>
      c.env.DB.prepare(
        "UPDATE items SET wear_count = wear_count + 1, last_worn_at = MAX(COALESCE(last_worn_at, ''), ?) WHERE id = ? AND user_id = ?",
      ).bind(b.wornOn, iid, uid),
    ),
  ]);
  return c.json({ id, itemIds: ids, wornOn: b.wornOn }, 201);
});

api.delete("/wears/:id", async (c) => {
  const uid = c.get("userId");
  const w = await c.env.DB.prepare("SELECT item_ids FROM wear_logs WHERE id = ? AND user_id = ?")
    .bind(c.req.param("id"), uid)
    .first<{ item_ids: string }>();
  if (!w) return c.notFound();
  const ids: string[] = JSON.parse(w.item_ids);
  await c.env.DB.batch([
    c.env.DB.prepare("DELETE FROM wear_logs WHERE id = ? AND user_id = ?").bind(c.req.param("id"), uid),
    ...ids.map((iid) =>
      c.env.DB.prepare(
        "UPDATE items SET wear_count = MAX(0, wear_count - 1) WHERE id = ? AND user_id = ?",
      ).bind(iid, uid),
    ),
  ]);
  return c.json({ ok: true });
});

/* ───────── 気になる・買い物リスト ───────── */

api.get("/wants", async (c) => {
  const r = await c.env.DB.prepare(
    "SELECT id, kind, image_key, tags, label, created_at FROM wants WHERE user_id = ? ORDER BY created_at DESC",
  )
    .bind(c.get("userId"))
    .all<{
      id: string;
      kind: string;
      image_key: string | null;
      tags: string;
      label: string | null;
      created_at: string;
    }>();
  return c.json(
    r.results.map((w) => ({
      id: w.id,
      kind: w.kind,
      imageKey: w.image_key,
      tags: JSON.parse(w.tags),
      label: w.label,
      createdAt: w.created_at,
    })),
  );
});

api.post("/wants", async (c) => {
  const uid = c.get("userId");
  const id = crypto.randomUUID();
  const type = c.req.header("content-type") ?? "";
  let kind: "check" | "archetype";
  let tags: ItemTags | null;
  let label: string | null = null;
  let imageKey: string | null = null;
  if (type.includes("multipart/form-data")) {
    const img = await readImage(c);
    if ("error" in img) return c.json({ error: img.error }, 400);
    if (!img.tags) return c.json({ error: "tags required" }, 400);
    kind = "check";
    tags = img.tags;
    imageKey = `${uid}/want-${id}/photo.jpg`;
    await c.env.BUCKET.put(imageKey, img.bytes, { httpMetadata: { contentType: img.mime } });
  } else {
    const b = await c.req.json<{ tags: ItemTags; label: string }>();
    if (!isItemTags(b.tags)) return c.json({ error: "invalid tags" }, 400);
    kind = "archetype";
    tags = clampTags(b.tags);
    label = String(b.label ?? "").slice(0, 60);
  }
  await c.env.DB.prepare(
    "INSERT INTO wants (id, user_id, kind, image_key, tags, label) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, uid, kind, imageKey, JSON.stringify(tags), label)
    .run();
  return c.json({ id, kind, imageKey, tags, label, createdAt: new Date().toISOString() }, 201);
});

api.delete("/wants/:id", async (c) => {
  const uid = c.get("userId");
  const w = await c.env.DB.prepare("SELECT image_key FROM wants WHERE id = ? AND user_id = ?")
    .bind(c.req.param("id"), uid)
    .first<{ image_key: string | null }>();
  if (!w) return c.notFound();
  await c.env.DB.prepare("DELETE FROM wants WHERE id = ? AND user_id = ?").bind(c.req.param("id"), uid).run();
  if (w.image_key) await c.env.BUCKET.delete(w.image_key);
  return c.json({ ok: true });
});

/* ───────── 天気 ───────── */

api.get("/weather", async (c) => {
  const u = await c.env.DB.prepare("SELECT lat, lon FROM users WHERE id = ?")
    .bind(c.get("userId"))
    .first<{ lat: number | null; lon: number | null }>();
  const lat = (u?.lat ?? 35.68).toFixed(2);
  const lon = (u?.lon ?? 139.76).toFixed(2);
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&timezone=auto&forecast_days=1`;
  const cache = caches.default;
  const key = new Request(url);
  let res = await cache.match(key);
  if (!res) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
      if (!r.ok) throw new Error(String(r.status));
      res = new Response(r.body, {
        headers: { "content-type": "application/json", "cache-control": "max-age=3600" },
      });
      c.executionCtx.waitUntil(cache.put(key, res.clone()));
    } catch {
      return c.json({ tempMax: 20, tempMin: 12, rain: 0, code: 0, fallback: true });
    }
  }
  const d = (await res.json()) as {
    daily: {
      temperature_2m_max: number[];
      temperature_2m_min: number[];
      precipitation_probability_max: number[];
      weather_code: number[];
    };
  };
  return c.json({
    tempMax: d.daily.temperature_2m_max[0],
    tempMin: d.daily.temperature_2m_min[0],
    rain: d.daily.precipitation_probability_max[0] ?? 0,
    code: d.daily.weather_code[0] ?? 0,
  });
});

app.route("/api", api);

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: "internal" }, 500);
});

export default app;
