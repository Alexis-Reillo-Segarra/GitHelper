# git-helper (CLI)

Analiza Pull Requests de GitHub usando Inteligencia Artificial, directamente desde la terminal.

## Instalación

```bash
# Uso puntual, sin instalar
npx @alexis-reillo/git-helper analyze -o vercel -r next.js -p 12345

# Instalación global
npm i -g @alexis-reillo/git-helper
git-helper analyze -o vercel -r next.js -p 12345
```

Requiere **Node.js >= 18**.

## Uso

```bash
git-helper analyze --owner <owner> --repo <repo> --pr <number>
```

| Opción            | Alias | Descripción                          |
| ----------------- | ----- | ------------------------------------ |
| `--owner <owner>` | `-o`  | Propietario del repo (ej: `vercel`)  |
| `--repo <repo>`   | `-r`  | Nombre del repositorio (ej: `next.js`) |
| `--pr <number>`   | `-p`  | Número del Pull Request              |

## Configuración (variables de entorno)

La CLI lee la configuración del entorno del sistema (o de un archivo `.env` en el
directorio actual). Necesitas, como mínimo, la clave del proveedor de IA elegido.

| Variable                          | Requerida           | Descripción                                                    |
| --------------------------------- | ------------------- | -------------------------------------------------------------- |
| `AI_PROVIDER`                     | No (`gemini`)       | Proveedor de IA: `gemini` u `openai`.                          |
| `GOOGLE_GENERATIVE_AI_API_KEY`    | Si `AI_PROVIDER=gemini` | Clave de [Google AI Studio](https://aistudio.google.com/apikey). |
| `OPENAI_API_KEY`                  | Si `AI_PROVIDER=openai` | Clave de OpenAI.                                          |
| `AI_MODEL`                        | No                  | Fuerza un modelo concreto (por defecto `gemini-2.5-flash` / `gpt-4o-mini`). |
| `AI_ENSEMBLE_RUNS`                | No (`3`)            | Nº de ejecuciones del ensemble por análisis (mediana). `1` lo desactiva. |
| `GITHUB_TOKEN`                    | No                  | Sube el rate limit y permite analizar repos privados.          |

Ejemplo en bash:

```bash
export AI_PROVIDER=gemini
export GOOGLE_GENERATIVE_AI_API_KEY=tu_clave
git-helper analyze -o vercel -r next.js -p 12345
```
