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

### Comandos

| Comando             | Alias     | Descripción                                  |
| ------------------- | --------- | -------------------------------------------- |
| `git-helper`        | —         | Muestra el banner y la ayuda.                |
| `git-helper list`   | `ls`      | Lista tus Pull Requests pendientes de revisar (requiere `GITHUB_TOKEN`). |
| `git-helper review` | `analyze` | Analiza un PR concreto con IA.               |
| `git-helper config` | —         | Gestiona la configuración guardada (claves y tokens). |

#### `review`

```bash
git-helper review --owner <owner> --repo <repo> --pr <number>
```

| Opción            | Alias | Descripción                          |
| ----------------- | ----- | ------------------------------------ |
| `--owner <owner>` | `-o`  | Propietario del repo (ej: `vercel`)  |
| `--repo <repo>`   | `-r`  | Nombre del repositorio (ej: `next.js`) |
| `--pr <number>`   | `-p`  | Número del Pull Request              |
| `--json`          | —     | Imprime el resultado en JSON (sin formato visual) |

#### `list`

```bash
export GITHUB_TOKEN=ghp_...
git-helper list           # tabla bonita
git-helper list --json    # salida JSON para scripts
```

#### `config`

Guarda tus claves de forma persistente en `~/.config/git-helper/.env` (permisos
`0600`), como alternativa a exportar variables de entorno cada vez.

```bash
git-helper config set GITHUB_TOKEN ghp_...
git-helper config set AI_PROVIDER gemini
git-helper config set GOOGLE_GENERATIVE_AI_API_KEY ...
git-helper config list     # secretos enmascarados
git-helper config unset OPENAI_API_KEY
git-helper config path     # ruta del archivo
```

Prioridad de configuración: **variables de entorno reales** > `.env` del directorio
actual > config global guardada.

> **Tip visual:** la interfaz usa color truecolor y arte ASCII. Para que la
> mascota y los iconos se vean perfectos, usa una terminal moderna (Windows
> Terminal, iTerm2…) con una [Nerd Font](https://www.nerdfonts.com/).

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
