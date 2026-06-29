# CLAUDE.md

Contexto del proyecto para Claude Code. Se carga automáticamente al inicio de
cada sesión: **no hace falta releer todo el repo**. Mantén este archivo al día
(ver [Mantenimiento](#mantenimiento-de-este-archivo) al final).

## Qué es GitHelper

Herramienta que analiza Pull Requests de GitHub con IA y devuelve un análisis
estructurado: resumen ejecutivo, lista de posibles bugs clasificados por
severidad, puntuación 1–10, recomendación categórica y aptitud para merge.

La nota **no la inventa el modelo**: el modelo solo detecta y clasifica problemas
por severidad (`critico` / `mayor` / `menor`); la puntuación y la recomendación
las calcula código determinista (`computeScore`), de modo que el mismo diff da
SIEMPRE el mismo resultado. Filosofía alineada con el estándar de Google ("mejora
la salud del código", no "perfección").

## Arquitectura (monorepo)

Monorepo con **Turborepo** + **pnpm** (`pnpm-workspace.yaml` → `apps/*`, `packages/*`).

| Paquete | Nombre | Qué es |
|---|---|---|
| `packages/core` | `@repo/core` | Lógica compartida: cliente GitHub + integración IA. **Sin build**: se consume como TS vía `main: ./src/index.ts`. |
| `apps/cli` | `@alexis-reillo/git-helper` | CLI (Commander) + TUI (Ink/React). Es el paquete publicable en npm (`bin: git-helper`). |
| `apps/web` | `@repo/web` | App Next.js 16 (App Router) con UI para analizar PRs. |

Flujo: ambas apps importan `@repo/core` directamente. La web lo importa incluso
dentro de los route handlers de Next (ventaja del monorepo).

### `packages/core` (el corazón)

- **`src/index.ts`** — `GitHubAIService`, la clase principal:
  - `analyzePR(owner, repo, pr)` — descarga el diff, lo **optimiza para ahorrar
    tokens** (`optimizeDiff`, ver abajo), lo trunca a 20 000 chars, lanza un
    **ensemble** de N ejecuciones en paralelo (`Promise.allSettled`, tolera
    fallos parciales) y devuelve la **mediana por puntuación**. La optimización
    se puede desactivar con `aiOptions.optimizeTokens: false`.
  - `runReview` (privado) — una sola revisión: `generateObject` (Vercel AI SDK)
    con `temperature: 0`, `SCORING_RUBRIC` como `system` y el diff como `prompt`.
    El modelo rellena `ReviewModelSchema` (interno); luego `computeScore` deriva
    nota/recomendación/aptitud.
  - `computeScore` — función pura. Penalización sobre base 10: critico −3,
    mayor −1.5, menor −0.5. Recomendación por severidad más alta presente:
    critico→`bloqueado`, mayor→`cambios_mayores`, menor→`cambios_menores`,
    nada→`aprobar`. `apto` solo si no hay críticos ni mayores.
  - Otros métodos GitHub: `getPRDiff`, `getPullHeadSha` (clave de caché),
    `getAuthenticatedUser`, `listUserRepos`, `listOpenPullRequests`,
    `listPendingPullRequests` (vía `/search/issues`).
  - `resolveModel` — selecciona proveedor IA y **carga el SDK de forma perezosa**
    (import dinámico de `@ai-sdk/*`) para acelerar arranque/cold-start.
  - `PRAnalysisSchema` / `PRAnalysis` — forma pública del análisis (Zod).
- **`src/diff-optimizer.ts`** — `optimizeDiff(diff)`: poda **determinista** del
  diff antes de enviarlo a la IA, para ahorrar tokens (clave: el ensemble
  multiplica el coste por N llamadas). Elimina ficheros sin valor para revisar
  (lockfiles, generados/vendorizados como `dist/`/`node_modules/`, minificados,
  `.map`, binarios y snapshots) y deja una nota resumen de lo omitido. Función
  pura, agnóstica del proveedor; devuelve el diff podado, la lista de omitidos y
  el ahorro de caracteres.
- **`src/github.ts`** — `GitHubClient`: wrapper fino sobre `fetch` global
  (no Octokit, se eliminó para ahorrar ~6,7 MB). `GitHubApiError` preserva el
  **código de estado** para que la UI enrute por status (no por texto).

### Proveedores de IA

Se elige con `AI_PROVIDER`; modelo opcional con `AI_MODEL`. Lista en
`AI_PROVIDERS` (`src/index.ts`): `gemini` (default, key `GOOGLE_GENERATIVE_AI_API_KEY`),
`openai`, `anthropic`, `kimi` (Moonshot) y `minimax`. Los dos últimos son
compatibles con la API de OpenAI vía `@ai-sdk/openai-compatible` + `AI_BASE_URL`.
Nº de ejecuciones del ensemble: `AI_ENSEMBLE_RUNS` (CLI default 3, web default 1).

### `apps/cli`

- `src/index.ts` — entry Commander. Comandos: `review` (alias `analyze`),
  `list` (alias `ls`), `config set/list/unset/path`. Sin subcomando abre la TUI.
  Los módulos pesados (core, ora, ink) se importan **perezosamente** dentro de
  cada acción para que `--help`/`--version`/`config` arranquen rápidos.
- `src/config.ts` — config global en `~/.config/git-helper/.env` (modo 0600).
  Prioridad: entorno real > `.env` del cwd > config global. Secretos enmascarados.
- `src/tui/` — TUI con Ink (React): `App.tsx`, `Setup.tsx`, `run.tsx`, tema.
- `src/ui/` — render no interactivo (tablas `cli-table3`, banner, colores chalk).
- Build con **tsup**; ejecución en dev con **tsx**.

### `apps/web` (Next.js 16 + App Router)

> ⚠️ Esta versión de Next tiene cambios que rompen respecto a tu conocimiento.
> Hay un `apps/web/CLAUDE.md` → `apps/web/AGENTS.md` que obliga a consultar
> `node_modules/next/dist/docs/` antes de escribir código de Next.

- Config (misma tipología que la CLI, **sin OAuth**): el usuario introduce su
  token de GitHub + proveedor de IA + API key en el asistente
  (`src/app/components/SetupWizard.tsx`, en `/login`). Se guardan en cookies
  (`src/lib/cookies.ts`) vía server actions (`src/app/actions.ts`:
  `saveConfig`/`clearConfig`); `saveConfig` verifica el token contra GitHub antes
  de guardar. `src/lib/config.ts` (`readConfig`) las lee en el servidor.
  `src/proxy.ts` protege rutas comprobando la presencia de las cookies.
- `src/app/api/analyze/route.ts` — POST: valida con Zod, exige config, llama a
  `createAnalysisService(config).analyzePR(...)`.
- `src/app/pr/[owner]/[repo]/[number]/page.tsx` — Server Component async bajo
  `<Suspense>`. **Cachea el análisis** con `unstable_cache` por
  `[owner, repo, number, sha, provider, model]` (el SHA invalida; la clave NO
  incluye credenciales → caché compartida por PR+modelo). `revalidate: 86400`.
- `src/lib/service.ts` — fábrica `createAnalysisService` con política de ensemble web.
- Estilos con **Tailwind v4**. Componentes en `src/app/components/`.

## Comandos

Desde la raíz (Turborepo orquesta los paquetes):

```sh
pnpm install
pnpm dev            # turbo run dev (todos)
pnpm build          # turbo run build
pnpm test           # turbo run test (vitest)
pnpm lint
pnpm check-types
pnpm format         # prettier
```

Específicos:

```sh
pnpm --filter @repo/web dev                       # web en http://localhost:3000
# CLI (desde apps/cli; invocar tsx directamente, ver nota del README):
npx tsx src/index.ts review -o <owner> -r <repo> -p <pr>
npx tsx src/index.ts list
```

## Tests

- **Vitest** en los tres paquetes (`*.test.ts(x)`), tests junto al código.
- Web además: **Playwright** e2e en `apps/web/e2e/` (`pnpm --filter @repo/web test:e2e`)
  y tests de accesibilidad con axe (`src/test/a11y.ts`).
- Hay skills locales en `.claude/skills/` (p. ej. `tdd`, `requesting-code-review`,
  `pre-push-check`, `analyze-pr`, `run-web`).

## Convenciones

- **TypeScript** estricto; código y comentarios en **español**.
- Importaciones perezosas (`await import`) para no penalizar el arranque — patrón
  deliberado, mantenerlo en CLI y en `resolveModel`.
- Errores de GitHub se enrutan por **código de estado** (`GitHubApiError.status`),
  nunca por el texto del mensaje.
- Secretos: nunca commitear `.env`/`.env.local`. Hay skill `pre-push-check`.

## Mantenimiento de este archivo

**Este archivo debe reflejar el estado real del proyecto.** Cuando hagas un
cambio que afecte a algo descrito aquí, actualiza la sección correspondiente en
el mismo trabajo. Dispara una actualización si:

- Añades/eliminas/renombras un paquete o app, o cambias su responsabilidad.
- Cambias la API pública de `@repo/core` (métodos de `GitHubAIService`, esquemas,
  `computeScore`, lógica de ensemble/caché).
- Añades/quitas un proveedor de IA o cambias variables de entorno / claves de config.
- Añades/cambias comandos de la CLI, scripts de `package.json` o flujo de build/test.
- Cambias el modelo de autenticación o el enrutado de la web.

Mantén las descripciones concisas: el "qué" y el "por qué", no copies el código.
Si una sección queda obsoleta, corrígela o bórrala — un contexto desactualizado
es peor que ninguno.
