# GitHelper

GitHelper es una herramienta que analiza Pull Requests de GitHub con IA y
devuelve un análisis estructurado: un resumen de los cambios, posibles bugs
detectados, una puntuación del 1 al 10 y una recomendación de si es apto para
hacer merge.

## Estructura del monorepo

Monorepo gestionado con [Turborepo](https://turborepo.dev/) y **pnpm**.

- `apps/cli`: CLI construida con [Commander](https://github.com/tj/commander.js)
  para analizar PRs desde la terminal.
- `apps/web`: aplicación [Next.js](https://nextjs.org/) que ofrece la interfaz
  de usuario.
- `packages/core`: lógica compartida de acceso a GitHub e integración con IA
  mediante el [Vercel AI SDK](https://sdk.vercel.ai/).

## Configuración

El proveedor de IA se selecciona con la variable de entorno `AI_PROVIDER`, que
acepta `gemini` u `openai`. Opcionalmente puedes fijar el modelo con `AI_MODEL`.

Claves necesarias según el proveedor:

- `gemini`: `GOOGLE_GENERATIVE_AI_API_KEY` (obtenida en Google AI Studio).
- `openai`: `OPENAI_API_KEY`.

De forma opcional, `GITHUB_TOKEN` permite aumentar los límites de la API de
GitHub y acceder a repositorios privados.

Tienes ficheros `.env.example` de referencia en `apps/cli` y `apps/web`.

## Cómo arrancar

Instala las dependencias desde la raíz del repositorio:

```sh
pnpm install
```

### Web

```sh
pnpm --filter @repo/web dev
```

Disponible en http://localhost:3000.

### CLI

Desde `apps/cli`:

```sh
npx tsx src/index.ts analyze -o <owner> -r <repo> -p <pr>
```

> Nota: al ejecutar la CLI a través de pnpm, el separador `--` se pasa de forma
> literal a los argumentos. Por eso se recomienda invocar `tsx` directamente.
