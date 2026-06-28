import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import dotenv from "dotenv";

export const CONFIG_DIR = join(homedir(), ".config", "git-helper");
export const CONFIG_FILE = join(CONFIG_DIR, ".env");

/** Claves de configuración reconocidas por la CLI. */
export const CONFIG_KEYS = [
    "AI_PROVIDER",
    "AI_MODEL",
    "AI_ENSEMBLE_RUNS",
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "OPENAI_API_KEY",
    "GITHUB_TOKEN",
] as const;

export type ConfigKey = (typeof CONFIG_KEYS)[number];

/** Claves cuyo valor es secreto y debe enmascararse al mostrarse. */
const SECRET_KEYS = new Set<ConfigKey>([
    "GOOGLE_GENERATIVE_AI_API_KEY",
    "OPENAI_API_KEY",
    "GITHUB_TOKEN",
]);

export const isConfigKey = (k: string): k is ConfigKey =>
    (CONFIG_KEYS as readonly string[]).includes(k);

/** Enmascara un secreto dejando solo los últimos 4 caracteres: "••••••3a9f". */
export function maskValue(key: string, value: string): string {
    if (!SECRET_KEYS.has(key as ConfigKey) || value.length <= 4) return value;
    return "•".repeat(Math.min(6, value.length - 4)) + value.slice(-4);
}

/**
 * Carga el archivo de configuración global como valores por defecto.
 * No sobreescribe variables ya presentes en el entorno ni en un `.env` local
 * (prioridad: entorno real > .env del cwd > config global).
 */
export function loadGlobalConfig(): void {
    if (existsSync(CONFIG_FILE)) {
        dotenv.config({ path: CONFIG_FILE, quiet: true });
    }
}

/** Lee el archivo de configuración como objeto clave/valor. */
export function readConfig(): Record<string, string> {
    if (!existsSync(CONFIG_FILE)) return {};
    return dotenv.parse(readFileSync(CONFIG_FILE));
}

/** Escribe el archivo de configuración con permisos restringidos (0600). */
function writeConfig(values: Record<string, string>): void {
    mkdirSync(CONFIG_DIR, { recursive: true });
    const body =
        CONFIG_KEYS.filter((k) => values[k] !== undefined)
            .map((k) => `${k}=${values[k]}`)
            .join("\n") + "\n";
    writeFileSync(CONFIG_FILE, body, { mode: 0o600 });
}

/** Inserta o actualiza una clave en el archivo de configuración. */
export function setConfig(key: ConfigKey, value: string): void {
    const current = readConfig();
    current[key] = value;
    writeConfig(current);
}

/** Elimina una clave del archivo de configuración. */
export function unsetConfig(key: ConfigKey): void {
    const current = readConfig();
    if (current[key] === undefined) return;
    delete current[key];
    writeConfig(current);
}
