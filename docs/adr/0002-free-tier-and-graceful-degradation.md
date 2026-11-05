# ADR 0002: Cloudflare の無料枠で動かし、枠を超えたら機能を落として動き続ける

- Status: Accepted
- Date: 2026-11-05

## Context

個人で無料で運用したい。Cloudflare の無料枠は、超えると多くのサービスが課金ではなくエラーになる（Workers AI・Images など）。

## Decision

- バックエンドは Cloudflare の無料プラン（Workers・D1・R2・Images・Workers AI）だけで構成する。Workers の有料プランは使わない
- 外部の処理が失敗したときは、アプリを止めずに機能を落とす
  - 背景の切り抜きに失敗 → 元の写真で登録
  - AI のタグ付けに失敗 → 確認待ちに入れて手で選んでもらう
  - 天気の取得に失敗 → 平年並みの気温として扱う

## Consequences

- 無料のまま、少人数なら困らずに使える
- 枠を超えた日は、登録の手間が少し増える
- R2 だけは超えると課金されるので、写真はブラウザで縮小してから送る（1着1MB以下）

## Alternatives considered

- **Workers の有料プラン（月$5）**：CPU 時間や一部のモデルの制限がなくなるが、今の規模では不要
- **Queues で裏の処理を管理する**：再試行が強くなるが、無料プランでは使えず、`waitUntil` で足りた（ADR 0003）
