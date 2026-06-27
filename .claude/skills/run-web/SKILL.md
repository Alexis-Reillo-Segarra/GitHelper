---
name: run-web
description: Launch the GitHelper Next.js web app (apps/web) that provides a browser UI for analyzing GitHub PRs. Use when asked to run, start, preview, or test the web frontend.
---

# Run the GitHelper web app

The web UI lives in `apps/web` (Next.js 16, React 19, Tailwind v4). It posts to
`/api/analyze`, which calls `@repo/core`'s `GitHubAIService.analyzePR(...)`.

## Prerequisites

- `OPENAI_API_KEY` set in `apps/web/.env` (gitignored — the API route runs server-side
  and reads it from the environment).
- `pnpm install` at the repo root.

## Start the dev server

```bash
pnpm --filter @repo/web dev
```

Then open http://localhost:3000. The form defaults to `vercel / next.js / 65000`.

## Production-like run

```bash
pnpm --filter @repo/web build
pnpm --filter @repo/web start
```

## Where things are

- Page / form: `apps/web/src/app/page.tsx` (client component).
- API route: `apps/web/src/app/api/analyze/route.ts` (POST, expects `{ owner, repo, pr }`).
- Shared analysis logic & Zod schema: `packages/core/src/index.ts`.

## Notes

- `apps/web/AGENTS.md` warns this Next.js version may differ from training data — check
  `node_modules/next/dist/docs/` before editing Next.js-specific code.
- A 400 is returned if `owner`, `repo`, or `pr` is missing; errors surface as the
  `message` field in the JSON response.
