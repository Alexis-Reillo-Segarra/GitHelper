# git-helper (CLI)

Analiza Pull Requests de GitHub usando Inteligencia Artificial, directamente desde
la terminal — con una **interfaz interactiva a pantalla completa** estilo Claude Code.

## Instalación

```bash
# Uso puntual, sin instalar
npx @alexis-reillo/git-helper

# Instalación global
npm i -g @alexis-reillo/git-helper
git-helper
```

Requiere **Node.js >= 18**.

## Inicio rápido (interfaz interactiva)

Ejecuta `git-helper` **sin argumentos** para abrir la TUI a pantalla completa:

```bash
git-helper
```

- La **primera vez** te pedirá tu **token de GitHub** (no hace falta configurarlo
  a mano antes): lo pegas, se guarda y entras directo. Ver
  [Token de GitHub](#token-de-github-primer-uso).
- Verás la lista de tus **PRs pendientes**. Navega con `↑↓`, pulsa `⏎` para
  analizar uno con IA, `r` para refrescar y `q` para salir.

> **Tip visual:** usa una terminal moderna (Windows Terminal, iTerm2…) con una
> [Nerd Font](https://www.nerdfonts.com/) para que la mascota y los iconos se
> vean perfectos.

## Token de GitHub (primer uso)

git-helper necesita un **personal access token** de GitHub para listar tus Pull
Requests pendientes. Tienes tres formas de dárselo (de más a menos cómoda):

1. **Automática (recomendada):** abre `git-helper` y, si no hay token, la propia
   interfaz te lo pedirá y lo guardará por ti. Nada más que hacer.
2. **Con el comando `config`** (persiste en `~/.config/git-helper/.env`, permisos `0600`):
   ```bash
   git-helper config set GITHUB_TOKEN ghp_xxx
   ```
3. **Variable de entorno** (puntual, no se guarda):
   ```bash
   export GITHUB_TOKEN=ghp_xxx      # bash/zsh
   $env:GITHUB_TOKEN="ghp_xxx"      # PowerShell
   ```

**Cómo crear el token:** ve a
[github.com/settings/tokens](https://github.com/settings/tokens) → *Generate new
token* → marca el scope **`repo`** (o un fine-grained con lectura de repos y PRs).

> El token se guarda **solo en tu equipo**. Para verlo/borrarlo:
> `git-helper config list` (enmascarado) · `git-helper config unset GITHUB_TOKEN`.

## Comandos (modo no interactivo)

Además de la TUI, todo está disponible como comandos sueltos (útil para scripting):

| Comando             | Alias     | Descripción                                  |
| ------------------- | --------- | -------------------------------------------- |
| `git-helper`        | —         | Abre la interfaz interactiva a pantalla completa. |
| `git-helper list`   | `ls`      | Lista tus Pull Requests pendientes (requiere `GITHUB_TOKEN`). |
| `git-helper review` | `analyze` | Analiza un PR concreto con IA.               |
| `git-helper config` | —         | Gestiona la configuración guardada (claves y tokens). |

### `review`

```bash
git-helper review --owner <owner> --repo <repo> --pr <number>
```

| Opción            | Alias | Descripción                          |
| ----------------- | ----- | ------------------------------------ |
| `--owner <owner>` | `-o`  | Propietario del repo (ej: `vercel`)  |
| `--repo <repo>`   | `-r`  | Nombre del repositorio (ej: `next.js`) |
| `--pr <number>`   | `-p`  | Número del Pull Request              |
| `--json`          | —     | Imprime el resultado en JSON (sin formato visual) |

### `list`

```bash
git-helper list           # tabla bonita
git-helper list --json    # salida JSON para scripts
```

### `config`

```bash
git-helper config set GITHUB_TOKEN ghp_...
git-helper config set GOOGLE_GENERATIVE_AI_API_KEY ...
git-helper config list     # secretos enmascarados
git-helper config unset OPENAI_API_KEY
git-helper config path     # ruta del archivo
```

## Configuración (variables de entorno)

Prioridad: **variables de entorno reales** > `.env` del directorio actual >
config global guardada (`config set`).

| Variable                          | Requerida           | Descripción                                                    |
| --------------------------------- | ------------------- | -------------------------------------------------------------- |
| `GITHUB_TOKEN`                    | Para `list` y la TUI | Token de GitHub (scope `repo`). Sube el rate limit y permite repos privados. |
| `AI_PROVIDER`                     | No (`gemini`)       | Proveedor de IA: `gemini` u `openai`.                          |
| `GOOGLE_GENERATIVE_AI_API_KEY`    | Si `AI_PROVIDER=gemini` | Clave de [Google AI Studio](https://aistudio.google.com/apikey). |
| `OPENAI_API_KEY`                  | Si `AI_PROVIDER=openai` | Clave de OpenAI.                                          |
| `AI_MODEL`                        | No                  | Fuerza un modelo concreto (por defecto `gemini-2.5-flash` / `gpt-4o-mini`). |
| `AI_ENSEMBLE_RUNS`                | No (`3`)            | Nº de ejecuciones del ensemble por análisis (mediana). `1` lo desactiva. |
