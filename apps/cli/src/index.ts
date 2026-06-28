import 'dotenv/config';
import { Command } from 'commander';
import { GitHubAIService } from "@repo/core";

const program = new Command();

program
    .name('git-helper')
    .description('Analiza Pull Requests de GitHub usando Inteligencia Artificial')
    .version('0.1.0');

// Definimos el comando "analyze"
program
    .command('analyze')
    .description('Analiza un PR específico')
    .requiredOption('-o, --owner <owner>', 'Propietario del repo (ej: vercel)')
    .requiredOption('-r, --repo <repo>', 'Nombre del repositorio (ej: next.js)')
    .requiredOption('-p, --pr <number>', 'Número del Pull Request', (v) => parseInt(v, 10))
    .action(async (options) => {
        console.log(`\n🔍 Analizando ${options.owner}/${options.repo}#${options.pr}...\n`);

        // Usamos el token de GitHub si está definido (sube el rate limit); si no, funciona para repos públicos
        const service = new GitHubAIService(process.env.GITHUB_TOKEN);

        try {
            const analysis = await service.analyzePR(options.owner, options.repo, options.pr);

            console.log("--- RESULTADO DE LA IA ---");
            console.log(`📝 Resumen: ${analysis.resumen_ejecutivo}`);
            console.log(`⭐ Puntuación: ${analysis.puntuacion_codigo}/10`);
            console.log(`🚀 Apto para Merge: ${analysis.apto_para_merge ? "✅ SÍ" : "❌ NO"}`);

            if (analysis.posibles_bugs.length > 0) {
                console.log("\n🐛 Posibles Bugs encontrados:");
                analysis.posibles_bugs.forEach((bug) => console.log(`   - ${bug}`));
            } else {
                console.log("\n✨ No se encontraron bugs evidentes.");
            }
            console.log("\n");

        } catch (error: any) {
            console.error("\n❌ Ocurrió un error:");
            console.error(error.message || error);
        }
    });

// Parsear los argumentos de la terminal
program.parse();