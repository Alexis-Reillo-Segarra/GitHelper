---
name: analyze-pr
description: Run the GitHelper CLI to analyze a GitHub Pull Request with AI. Use when the user wants to analyze a PR, get an AI review/score of a PR, or test the @repo/cli command locally.
---

# Analyze a GitHub PR with the GitHelper CLI

The CLI lives in `apps/cli` and uses `@repo/core` (`GitHubAIService`) to download a PR diff
from GitHub and send it to OpenAI (`gpt-4o-mini`) for a structured review.

## Prerequisites

- `OPENAI_API_KEY` must be set. The CLI loads it via `dotenv` from `apps/cli/.env`
  (this file is gitignored — never commit it).
- Dependencies installed: `pnpm install` at the repo root.

## Run it

From the repo root, pass `--owner`, `--repo` and `--pr`:

```bash
pnpm --filter @repo/cli start -- analyze --owner vercel --repo next.js --pr 65000
```

Or in watch mode while developing:

```bash
pnpm --filter @repo/cli dev -- analyze -o vercel -r next.js -p 65000
```

## Expected output

A structured analysis printed to the console:
- `resumen_ejecutivo` — 2-sentence summary
- `puntuacion_codigo` — quality score 1–10
- `apto_para_merge` — merge-readiness boolean
- `posibles_bugs` — list of likely bugs

## Notes

- Without a GitHub token the service works only for **public** repos and hits a low rate limit.
  To raise the limit, construct `new GitHubAIService(token)` in `apps/cli/src/index.ts`.
- Diffs are truncated to 20,000 chars before being sent to the model (`packages/core/src/index.ts`).
- An empty diff throws `"El PR no tiene cambios de código (diff vacío)."`.
