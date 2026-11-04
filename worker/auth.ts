import { decodeIdToken, Google, generateCodeVerifier, generateState } from "arctic";
import type { Context, MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

const SESSION_COOKIE = "sid";
const SESSION_DAYS = 30;
const DAY = 86400_000;

export type AuthVars = { Variables: { userId: string } };
type C = Context<{ Bindings: Env } & AuthVars>;

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isSecure(c: C) {
  return new URL(c.req.url).protocol === "https:";
}

function google(c: C) {
  const origin = new URL(c.req.url).origin;
  return new Google(c.env.GOOGLE_CLIENT_ID, c.env.GOOGLE_CLIENT_SECRET, `${origin}/auth/google/callback`);
}

async function createSession(c: C, userId: string) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const id = await sha256(token);
  const expires = Date.now() + SESSION_DAYS * DAY;
  await c.env.DB.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(id, userId, expires)
    .run();
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isSecure(c),
    sameSite: "Lax",
    path: "/",
    expires: new Date(expires),
  });
}

async function upsertUser(
  db: D1Database,
  p: { sub: string; email: string; name: string; picture: string | null },
): Promise<string> {
  const existing = await db
    .prepare("SELECT id FROM users WHERE google_sub = ?")
    .bind(p.sub)
    .first<{ id: string }>();
  if (existing) {
    await db
      .prepare("UPDATE users SET email = ?, name = ?, picture = ? WHERE id = ?")
      .bind(p.email, p.name, p.picture, existing.id)
      .run();
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db
    .prepare("INSERT INTO users (id, google_sub, email, name, picture) VALUES (?, ?, ?, ?, ?)")
    .bind(id, p.sub, p.email, p.name, p.picture)
    .run();
  return id;
}

export const authRoutes = new Hono<{ Bindings: Env } & AuthVars>();

authRoutes.get("/google", (c) => {
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = google(c).createAuthorizationURL(state, verifier, ["openid", "email", "profile"]);
  url.searchParams.set("prompt", "select_account");
  const opts = { httpOnly: true, secure: isSecure(c), sameSite: "Lax" as const, path: "/", maxAge: 600 };
  setCookie(c, "oauth_state", state, opts);
  setCookie(c, "oauth_verifier", verifier, opts);
  return c.redirect(url.toString());
});

authRoutes.get("/google/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const savedState = getCookie(c, "oauth_state");
  const verifier = getCookie(c, "oauth_verifier");
  deleteCookie(c, "oauth_state", { path: "/" });
  deleteCookie(c, "oauth_verifier", { path: "/" });
  if (!code || !state || !savedState || !verifier || state !== savedState)
    return c.redirect("/?login=failed");
  try {
    const tokens = await google(c).validateAuthorizationCode(code, verifier);
    const claims = decodeIdToken(tokens.idToken()) as {
      sub: string;
      email: string;
      name?: string;
      picture?: string;
    };
    const userId = await upsertUser(c.env.DB, {
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? claims.email.split("@")[0],
      picture: claims.picture ?? null,
    });
    await createSession(c, userId);
    return c.redirect("/");
  } catch (e) {
    console.error("oauth callback failed", e);
    return c.redirect("/?login=failed");
  }
});

authRoutes.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (token)
    await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?")
      .bind(await sha256(token))
      .run();
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

/** ローカル確認専用。DEV_AUTH=1 のときだけ有効 */
authRoutes.get("/dev", async (c) => {
  if (c.env.DEV_AUTH !== "1") return c.notFound();
  const userId = await upsertUser(c.env.DB, {
    sub: "dev-user",
    email: "dev@example.com",
    name: "Dev",
    picture: null,
  });
  await createSession(c, userId);
  return c.redirect("/");
});

authRoutes.get("/config", (c) => c.json({ dev: c.env.DEV_AUTH === "1" }));

export const requireAuth: MiddlewareHandler<{ Bindings: Env } & AuthVars> = async (c, next) => {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return c.json({ error: "unauthorized" }, 401);
  const id = await sha256(token);
  const row = await c.env.DB.prepare("SELECT user_id, expires_at FROM sessions WHERE id = ?")
    .bind(id)
    .first<{ user_id: string; expires_at: number }>();
  if (!row || row.expires_at < Date.now()) {
    if (row) await c.env.DB.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
    return c.json({ error: "unauthorized" }, 401);
  }
  // 残り半分を切ったら延長
  if (row.expires_at - Date.now() < (SESSION_DAYS / 2) * DAY) {
    const expires = Date.now() + SESSION_DAYS * DAY;
    await c.env.DB.prepare("UPDATE sessions SET expires_at = ? WHERE id = ?").bind(expires, id).run();
    setCookie(c, SESSION_COOKIE, token, {
      httpOnly: true,
      secure: isSecure(c),
      sameSite: "Lax",
      path: "/",
      expires: new Date(expires),
    });
  }
  c.set("userId", row.user_id);
  await next();
};
