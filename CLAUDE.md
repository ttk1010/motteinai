# Motteinai

AI（Claude Code）がこのリポジトリで開発するときの指針です。実装を判断する前に、README.ja.md と docs/ARCHITECTURE.md を読むこと。

## 守ること

- **判定はルールで行う**。画面に出る数字（似ている%、＋N通り、買い／保留／見送り）は `src/shared/engine.ts` だけで計算し、変更したら `tests/engine.test.ts` を足す。AI はタグ付けにだけ使う（docs/adr/0001）
- **Cloudflare の無料枠に収める**。外部サービスが失敗したら、止めずに機能を落とす（docs/adr/0002）
- **画面の文言はラベル・数字・操作だけ**。キャッチコピーや説明文を足さない
- **全画面にスケルトン**。アニメーションは transform / opacity のみ、`prefers-reduced-motion` を守る
- **秘密の値をコミットしない**。秘密は GitHub Actions Secrets に置く（docs/adr/0004）

## 確認

```bash
npm run lint && npm run typecheck && npm test && npx vite build
```

UI を変えたら、スマホ幅（390×844）でローカル起動して画面を確かめる（`DEV_AUTH=1`、`MOCK_AI=1`）。

## ドキュメント

- ユーザーに見える変更 → README.md と README.ja.md の両方
- 構成の変更 → docs/ARCHITECTURE.md
- 大きな設計判断 → docs/adr/（0000-template.md をコピー）
- セットアップでつまずいた点 → docs/TROUBLESHOOTING.md、手順が変わったら docs/SETUP_GUIDE.md
