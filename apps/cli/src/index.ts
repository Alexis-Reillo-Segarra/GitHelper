import "dotenv/config";
import { Command } from "commander";
import ora from "ora";
import { GitHubAIService } from "@repo/core";
import { renderBanner } from "./ui/banner";
import { c } from "./ui/theme";
import { analysisCard, pendingTable } from "./ui/render";

const program = new Command();

program
    .name("git-helper")
    .description("Code review de Pull Requests de GitHub con IA, desde la terminal")
    .version("0.1.0", "-V, --version", "muestra la versión")
    .addHelpText("beforeAll", renderBanner());

// ── review (alias: analyze) ────────────────────────────────────────────────
program
    .command("review")
    .alias("analyze")
    .description("Analiza un PR concreto con IA")
    .requiredOption("-o, --owner <owner>", "propietario del repo (ej: vercel)")
    .requiredOption("-r, --repo <repo>", "nombre del repositorio (ej: next.js)")
    .requiredOption("-p, --pr <number>", "número del Pull Request", (v) => parseInt(v, 10))
    .action(async (opts: { owner: string; repo: string; pr: number }) => {
        const ref = `${opts.owner}/${opts.repo} #${opts.pr}`;
        const spinner = ora({ text: c.gray(`Analizando ${ref} con IA…`), color: "magenta" }).start();
        const service = new GitHubAIService(process.env.GITHUB_TOKEN);
        try {
            const analysis = await service.analyzePR(opts.owner, opts.repo, opts.pr);
            spinner.stop();
            console.log("\n" + analysisCard(ref, analysis) + "\n");
        } catch (error: any) {
            spinner.stop();
            console.error("\n" + c.bad("✗ " + (error?.message ?? String(error))) + "\n");
            process.exitCode = 1;
        }
    });

// ── list (alias: ls) ───────────────────────────────────────────────────────
program
    .command("list")
    .alias("ls")
    .description("Lista tus Pull Requests pendientes de revisar")
    .action(async () => {
        if (!process.env.GITHUB_TOKEN) {
            console.error(
                "\n" +
                    c.bad("✗ Necesitas un GITHUB_TOKEN para listar tus PRs pendientes.") +
                    "\n" +
                    c.dim("  Exporta el token: ") +
                    c.light("export GITHUB_TOKEN=ghp_...") +
                    "\n"
            );
            process.exitCode = 1;
            return;
        }
        const spinner = ora({ text: c.gray("Buscando tus PRs pendientes…"), color: "magenta" }).start();
        const service = new GitHubAIService(process.env.GITHUB_TOKEN);
        try {
            const prs = await service.listPendingPullRequests();
            spinner.stop();
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
            spinner.stop();
            console.error("\n" + c.bad("✗ " + (error?.message ?? String(error))) + "\n");
            process.exitCode = 1;
        }
    });

// Sin subcomando: banner + ayuda (a lo Claude Code).
program.action(() => {
    program.help();
});

program.parse();
