import dotenv from "dotenv";
import { Command } from "commander";
import ora from "ora";
import { GitHubAIService } from "@repo/core";
import { renderBanner } from "./ui/banner";
import { c } from "./ui/theme";
import { analysisCard, pendingTable } from "./ui/render";
import {
    CONFIG_FILE,
    CONFIG_KEYS,
    isConfigKey,
    loadGlobalConfig,
    maskValue,
    readConfig,
    setConfig,
    unsetConfig,
} from "./config";

// .env del cwd (si existe) y luego la config global como fallback.
// El entorno real tiene prioridad; quiet:true evita los mensajes de dotenv.
dotenv.config({ quiet: true });
loadGlobalConfig();

const program = new Command();

program
    .name("git-helper")
    .description("Code review de Pull Requests de GitHub con IA, desde la terminal")
    .version("0.2.0", "-V, --version", "muestra la versión")
    .addHelpText("beforeAll", renderBanner());

// ── review (alias: analyze) ────────────────────────────────────────────────
program
    .command("review")
    .alias("analyze")
    .description("Analiza un PR concreto con IA")
    .requiredOption("-o, --owner <owner>", "propietario del repo (ej: vercel)")
    .requiredOption("-r, --repo <repo>", "nombre del repositorio (ej: next.js)")
    .requiredOption("-p, --pr <number>", "número del Pull Request", (v) => parseInt(v, 10))
    .option("--json", "imprime el resultado en JSON (sin formato visual)")
    .action(async (opts: { owner: string; repo: string; pr: number; json?: boolean }) => {
        const ref = `${opts.owner}/${opts.repo} #${opts.pr}`;
        const spinner = opts.json
            ? null
            : ora({ text: c.gray(`Analizando ${ref} con IA…`), color: "magenta" }).start();
        const service = new GitHubAIService(process.env.GITHUB_TOKEN);
        try {
            const analysis = await service.analyzePR(opts.owner, opts.repo, opts.pr);
            spinner?.stop();
            if (opts.json) {
                console.log(JSON.stringify(analysis, null, 2));
            } else {
                console.log("\n" + analysisCard(ref, analysis) + "\n");
            }
        } catch (error: any) {
            spinner?.stop();
            console.error("\n" + c.bad("✗ " + (error?.message ?? String(error))) + "\n");
            process.exitCode = 1;
        }
    });

// ── list (alias: ls) ───────────────────────────────────────────────────────
program
    .command("list")
    .alias("ls")
    .description("Lista tus Pull Requests pendientes de revisar")
    .option("--json", "imprime la lista en JSON (sin formato visual)")
    .action(async (opts: { json?: boolean }) => {
        if (!process.env.GITHUB_TOKEN) {
            console.error(
                "\n" +
                    c.bad("✗ Necesitas un GITHUB_TOKEN para listar tus PRs pendientes.") +
                    "\n" +
                    c.dim("  Guárdalo con  ") +
                    c.light("git-helper config set GITHUB_TOKEN ghp_...") +
                    "\n"
            );
            process.exitCode = 1;
            return;
        }
        const spinner = opts.json
            ? null
            : ora({ text: c.gray("Buscando tus PRs pendientes…"), color: "magenta" }).start();
        const service = new GitHubAIService(process.env.GITHUB_TOKEN);
        try {
            const prs = await service.listPendingPullRequests();
            spinner?.stop();
            if (opts.json) {
                console.log(JSON.stringify(prs, null, 2));
                return;
            }
            if (prs.length === 0) {
                console.log("\n" + c.ok("✓ No tienes PRs pendientes. ¡Todo limpio!") + "\n");
                return;
            }
            console.log("\n" + c.purpleBold(`  ${prs.length} PR pendiente${prs.length === 1 ? "" : "s"}`) + "\n");
            console.log(pendingTable(prs));
            console.log(
                "\n" +
                    c.dim("  Analiza uno con  ") +
                    c.light("git-helper review -o <owner> -r <repo> -p <n>") +
                    "\n"
            );
        } catch (error: any) {
            spinner?.stop();
            console.error("\n" + c.bad("✗ " + (error?.message ?? String(error))) + "\n");
            process.exitCode = 1;
        }
    });

// ── config ─────────────────────────────────────────────────────────────────
const config = program
    .command("config")
    .description(`Gestiona la configuración guardada en ${CONFIG_FILE}`);

config
    .command("set <key> <value>")
    .description("Guarda una clave de configuración")
    .action((key: string, value: string) => {
        if (!isConfigKey(key)) {
            console.error(
                "\n" +
                    c.bad(`✗ Clave desconocida: ${key}`) +
                    "\n" +
                    c.dim("  Claves válidas: ") +
                    c.light(CONFIG_KEYS.join(", ")) +
                    "\n"
            );
            process.exitCode = 1;
            return;
        }
        setConfig(key, value);
        console.log("\n" + c.ok(`✓ ${key} guardada`) + c.dim(` en ${CONFIG_FILE}`) + "\n");
    });

config
    .command("list")
    .alias("get")
    .description("Muestra la configuración guardada (secretos enmascarados)")
    .action(() => {
        const cfg = readConfig();
        const keys = Object.keys(cfg);
        if (keys.length === 0) {
            console.log("\n" + c.dim("  Sin configuración guardada.") + "\n");
            return;
        }
        console.log("");
        for (const k of CONFIG_KEYS) {
            if (cfg[k] === undefined) continue;
            console.log("  " + c.purple(k.padEnd(30)) + c.white(maskValue(k, cfg[k])));
        }
        console.log("");
    });

config
    .command("unset <key>")
    .description("Elimina una clave de configuración")
    .action((key: string) => {
        if (!isConfigKey(key)) {
            console.error("\n" + c.bad(`✗ Clave desconocida: ${key}`) + "\n");
            process.exitCode = 1;
            return;
        }
        unsetConfig(key);
        console.log("\n" + c.ok(`✓ ${key} eliminada`) + "\n");
    });

config
    .command("path")
    .description("Muestra la ruta del archivo de configuración")
    .action(() => console.log(CONFIG_FILE));

config.action(() => config.help());

// Sin subcomando: abre la TUI interactiva a pantalla completa (estilo Claude Code).
// Ink se carga de forma perezosa para no penalizar el arranque de los subcomandos.
program.action(async () => {
    const { runTui } = await import("./tui/run");
    await runTui(process.env.GITHUB_TOKEN);
});

program.parse();
