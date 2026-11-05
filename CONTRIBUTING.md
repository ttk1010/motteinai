# Contributing to Mottenai

Thanks for your interest! This project values small, reviewable changes and keeping the app quiet: no marketing copy, numbers over adjectives.

## Development setup

Requires Node.js 22+.

```bash
npm install
cp .dev.vars.example .dev.vars   # DEV_AUTH=1 and MOCK_AI=1 for local work
npm run db:migrate:local
npm run dev                      # http://localhost:5173
```

```bash
npm run lint        # Biome
npm run typecheck   # TypeScript (app + worker)
npm test            # Vitest (judgment engine)
```

CI runs the same lint, typecheck, tests and build on every push and pull request.

## Workflow

1. Start from (or open) a GitHub Issue describing the why, the goal and the definition of done.
2. Branch from `main`: `feature/<name>`, `fix/<name>`, `docs/<topic>`.
3. Keep changes small and focused.
4. Add tests for changes to `src/shared/` (the judgment engine). Tests must not need network or API keys.
5. Update docs alongside code: README for user-facing changes, `docs/ARCHITECTURE.md` for structure, `docs/adr/` for significant decisions, `docs/TROUBLESHOOTING.md` for new setup snags.
6. Open a pull request and make sure CI is green.

## Guidelines

- Judgments are rules, not AI. Anything that produces a number on screen (`似ている 87%`, `＋12通り`) lives in `src/shared/engine.ts` and is tested. See [ADR 0001](docs/adr/0001-rule-based-judgment.md).
- Stay within Cloudflare's free tier, and degrade instead of failing when a service is unavailable ([ADR 0002](docs/adr/0002-free-tier-and-graceful-degradation.md)).
- UI text is labels, numbers and actions only. No taglines or explanatory copy.
- Every screen has a skeleton; motion uses `transform`/`opacity` and respects `prefers-reduced-motion`.
- Never commit secrets. Secrets live in GitHub Actions Secrets ([ADR 0004](docs/adr/0004-secrets-in-github.md)).

## Reporting issues

Open a GitHub Issue with steps to reproduce, expected vs actual behavior, and your device/browser. For setup snags, check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) first.
