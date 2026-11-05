# ADR 0004: 秘密の値は GitHub Secrets だけで管理し、公開時に Worker へ反映する

- Status: Accepted
- Date: 2026-11-05

## Context

公開には Cloudflare の APIトークン、ログインには Google のクライアントシークレットが必要。置き場所が GitHub と Cloudflare に分かれると、どちらが最新か分からなくなり、初心者が迷う。

## Decision

4つの値（`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`）はすべて GitHub の Actions Secrets に置く。Google の2つは、公開のたびに `wrangler secret bulk` で Worker のシークレットへ反映する。未登録のときは警告を出して飛ばす。

## Consequences

- 値を変えるときは GitHub だけを更新すればよい
- Cloudflare のダッシュボードで直接変えた値は、次の公開で GitHub の値に上書きされる
- 公開のたびに Worker の新しいバージョンが1つ増える

## Alternatives considered

- **Cloudflare のダッシュボードに直接登録する**：手順は短いが、GitHub と二重管理になる
