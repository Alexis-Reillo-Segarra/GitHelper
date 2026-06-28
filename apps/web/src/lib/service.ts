import { GitHubAIService } from "@repo/core";
import type { WebConfig } from "@/lib/config";

// Nº de ejecuciones del ensemble en la web. A diferencia del CLI (3 por
// defecto, para reducir varianza entre sesiones), la web prioriza el coste:
// con la caché por SHA el resultado se fija tras la primera ejecución, así que
// 1 run suele bastar. Se puede subir con AI_ENSEMBLE_RUNS.
function webEnsembleRuns(): number {
    const n = Number(process.env.AI_ENSEMBLE_RUNS);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

/**
 * Crea el servicio de análisis a partir de la configuración del usuario (leída
 * de las cookies). Inyecta el token de GitHub y las credenciales del proveedor
 * de IA explícitamente, en vez de depender de variables de entorno del servidor.
 */
export function createAnalysisService(config: WebConfig): GitHubAIService {
    return new GitHubAIService(config.githubToken, {
        provider: config.provider,
        model: config.model,
        apiKey: config.aiKey,
        ensembleRuns: webEnsembleRuns(),
    });
}
