import { GitHubAIService } from "@repo/core";

// Nº de ejecuciones del ensemble en la web. A diferencia del CLI (3 por
// defecto, para reducir varianza entre sesiones), la web prioriza el coste:
// con la caché por SHA el resultado se fija tras la primera ejecución, así que
// 1 run suele bastar. Se puede subir con AI_ENSEMBLE_RUNS.
function webEnsembleRuns(): number {
    const n = Number(process.env.AI_ENSEMBLE_RUNS);
    return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Crea el servicio de análisis para la web con su política de ensemble. */
export function createAnalysisService(token: string): GitHubAIService {
    return new GitHubAIService(token, { ensembleRuns: webEnsembleRuns() });
}
