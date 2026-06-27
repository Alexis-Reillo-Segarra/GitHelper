---
name: pre-push-check
description: Verify this repo is safe to push to GitHub — no secrets (.env / API keys) tracked or in history, build/types pass. Use before pushing, creating the first remote, or opening a PR.
---

# Pre-push safety check for GitHelper

This repo holds a real `OPENAI_API_KEY` in `.env` files. Always confirm secrets stay local
before pushing.

## 1. Confirm every .env is ignored

```bash
for f in $(git ls-files --others --exclude-standard --ignored --directory 2>/dev/null; find . -name '.env*' -not -path '*/node_modules/*'); do
  git check-ignore -q "$f" && echo "IGNORED  $f" || echo "TRACKED! $f"
done
```

Any `TRACKED!` line is a blocker — fix `.gitignore` and `git rm --cached <file>` before pushing.

## 2. No secret in history

```bash
git log --all -p -S 'sk-proj' --oneline | head
git log --all -p -S 'OPENAI_API_KEY' --oneline | head
```

Output must be empty. If not, the key leaked into history — rotate it and scrub history
(e.g. `git filter-repo`) before pushing.

## 3. No staged secrets / unexpected files

```bash
git status --short
git diff --cached --name-only
```

## 4. Build & types (optional but recommended)

```bash
pnpm install
pnpm build
pnpm check-types
```

## 5. Push

```bash
git add -A
git commit -m "..."
git remote add origin <url>   # only if no remote yet
git push -u origin main
```

If the OpenAI key was ever exposed outside this machine, **rotate it** in the OpenAI dashboard
regardless of git status.
