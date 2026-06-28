import { Octokit } from "@octokit/rest";
import { generateObject, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { anthropic } from "@ai-sdk/anthropic";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

// Recomendación final del análisis, alineada con la filosofía de Google
// ("mejora la salud del código" en vez de "perfección"): una escala corta y
// categórica es más fiable y consistente que una nota holística 1-10.
export const RECOMENDACIONES = [
    "aprobar",
    "cambios_menores",
    "cambios_mayores",
    "bloqueado",
] as const;
export type Recomendacion = (typeof RECOMENDACIONES)[number];

// 1. Forma del análisis que expone la app (la nota y la recomendación las
// calcula el sistema; ver computeScore).
export const PRAnalysisSchema = z.object({
    resumen_ejecutivo: z.string().describe("Resumen de 2 frases de lo que hace el PR"),
    posibles_bugs: z.array(z.string()).describe("Lista de posibles bugs o errores lógicos"),
    apto_para_merge: z.boolean().describe("True si no hay bugs críticos ni mayores"),
    puntuacion_codigo: z.number().min(1).max(10).describe("Puntuación de calidad del 1 al 10"),
    recomendacion: z.enum(RECOMENDACIONES).describe("Recomendación categórica de revisión"),
});

export type PRAnalysis = z.infer<typeof PRAnalysisSchema>;

// 1.c Tipos resumidos para la conexión con GitHub.
// Solo exponemos los campos que la app necesita, no los objetos crudos de Octokit.

// Datos básicos del usuario autenticado (para verificar el token y mostrar quién está logueado)
export type GitHubUser = {
    login: string;
    name: string | null;
    avatar_url: string;
};

// Resumen de un repositorio del usuario
export type RepoSummary = {
    owner: string;
    name: string;
    full_name: string;
    private: boolean;
    description: string | null;
    updated_at: string | null;
};

// Resumen de un Pull Request abierto
export type PullSummary = {
    number: number;
    title: string;
    author: string | null;
    created_at: string;
    url: string;
};

// Pull Request pendiente en alguno de los repos del usuario (para el dashboard personal).
// Incluye owner/repo para poder navegar directamente a su análisis.
export type PendingPR = {
    owner: string;
    repo: string;
    full_name: string;
    number: number;
    title: string;
    author: string | null;
    created_at: string;
    url: string;
    draft: boolean;
};

// 1.b Selección del proveedor de IA.
// Se elige con la variable de entorno AI_PROVIDER y la API key correspondiente.
// El modelo concreto se puede sobreescribir con AI_MODEL.
export type AIProvider = "gemini" | "openai" | "anthropic" | "kimi" | "minimax";

// Metadatos de cada proveedor: alimentan el selector de la CLI y la validación.
// `apiKeyEnv` es la variable de entorno donde vive su clave; `apiKeyUrl` indica
// al usuario dónde conseguirla.
// Un modelo concreto que ofrece un proveedor: `id` es lo que se manda a la API
// (y se guarda en AI_MODEL); `label` es una descripción legible para la CLI.
export type ModelInfo = {
    id: string;
    label: string;
};

export type ProviderInfo = {
    id: AIProvider;
    label: string;
    icon: string;
    apiKeyEnv: string;
    defaultModel: string;
    apiKeyUrl: string;
    // Modelos sugeridos para el selector. El primero suele ser el `defaultModel`.
    // No es exhaustivo: cualquier modelo del proveedor sirve vía AI_MODEL.
    models: ModelInfo[];
};

export const AI_PROVIDERS: ProviderInfo[] = [
    {
        id: "gemini",
        label: "Gemini · Google",
        icon: "✦",
        apiKeyEnv: "GOOGLE_GENERATIVE_AI_API_KEY",
        defaultModel: "gemini-2.5-flash",
        apiKeyUrl: "https://aistudio.google.com/apikey",
        models: [
            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash · rápido y barato" },
            { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro · más capaz" },
        ],
    },
    {
        id: "openai",
        label: "GPT · OpenAI",
        icon: "◉",
        apiKeyEnv: "OPENAI_API_KEY",
        defaultModel: "gpt-4o-mini",
        apiKeyUrl: "https://platform.openai.com/api-keys",
        models: [
            { id: "gpt-4o-mini", label: "GPT-4o mini · rápido y barato" },
            { id: "gpt-4o", label: "GPT-4o · más capaz" },
        ],
    },
    {
        id: "anthropic",
        label: "Claude · Anthropic",
        icon: "✶",
        apiKeyEnv: "ANTHROPIC_API_KEY",
        defaultModel: "claude-haiku-4-5-20251001",
        apiKeyUrl: "https://console.anthropic.com/settings/keys",
        models: [
            { id: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 · rápido y barato" },
            { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 · equilibrado" },
            { id: "claude-opus-4-8", label: "Claude Opus 4.8 · máxima calidad" },
        ],
    },
    {
        id: "kimi",
        label: "Kimi · Moonshot",
        icon: "☾",
        apiKeyEnv: "MOONSHOT_API_KEY",
        defaultModel: "kimi-k2-0711-preview",
        apiKeyUrl: "https://platform.moonshot.ai/console/api-keys",
        models: [{ id: "kimi-k2-0711-preview", label: "Kimi K2" }],
    },
    {
        id: "minimax",
        label: "MiniMax",
        icon: "⬣",
        apiKeyEnv: "MINIMAX_API_KEY",
        defaultModel: "MiniMax-M1",
        apiKeyUrl: "https://www.minimax.io/platform",
        models: [{ id: "MiniMax-M1", label: "MiniMax M1" }],
    },
];

// Base URL de los proveedores compatibles con la API de OpenAI (configurable
// por entorno por si cambian o el usuario usa un proxy).
const OPENAI_COMPATIBLE_BASE_URL: Partial<Record<AIProvider, string>> = {
    kimi: "https://api.moonshot.ai/v1",
    minimax: "https://api.minimax.io/v1",
};

export function getProvider(id: string): ProviderInfo | undefined {
    const norm = id.toLowerCase();
    return AI_PROVIDERS.find(
        (p) => p.id === norm || (norm === "google" && p.id === "gemini") || (norm === "gpt" && p.id === "openai") || (norm === "claude" && p.id === "anthropic"),
    );
}

export function resolveModel(provider?: AIProvider, model?: string): LanguageModel {
    // Prioridad: argumento explícito > variable de entorno > "gemini" por defecto
    const selected = provider ?? process.env.AI_PROVIDER ?? "gemini";
    const info = getProvider(selected);
    if (!info) {
        throw new Error(
            `AI_PROVIDER desconocido: "${selected}". Válidos: ${AI_PROVIDERS.map((p) => p.id).join(", ")}.`,
        );
    }

    const apiKey = process.env[info.apiKeyEnv];
    if (!apiKey) {
        throw new Error(
            `Falta la variable ${info.apiKeyEnv}, requerida para el proveedor "${info.id}". Consíguela en ${info.apiKeyUrl}`,
        );
    }

    const modelName = model ?? process.env.AI_MODEL ?? info.defaultModel;

    switch (info.id) {
        case "gemini":
            return google(modelName);
        case "openai":
            return openai(modelName);
        case "anthropic":
            return anthropic(modelName);
        case "kimi":
        case "minimax": {
            const baseURL =
                process.env.AI_BASE_URL ?? OPENAI_COMPATIBLE_BASE_URL[info.id];
            if (!baseURL) {
                throw new Error(
                    `Falta la base URL para "${info.id}". Defínela con AI_BASE_URL.`,
                );
            }
            const client = createOpenAICompatible({ name: info.id, apiKey, baseURL });
            return client(modelName);
        }
    }
}

// 1.d Estándares de revisión.
// El modelo NO inventa la nota: solo detecta y clasifica problemas por severidad
// siguiendo definiciones fijas. La puntuación la calcula el sistema (ver
// `computeScore`), de modo que el mismo conjunto de problemas da SIEMPRE la misma nota.
const SCORING_RUBRIC = `Eres un ingeniero de software Senior revisando un Pull Request. Evalúa ÚNICAMENTE el diff proporcionado.

Criterios a revisar, por orden de importancia (basados en el estándar de Google):
1. Diseño: ¿encajan e interactúan bien las piezas del cambio? ¿pertenece aquí y se integra con el resto del sistema?
2. Complejidad / over-engineering: ¿es más complejo o genérico de lo necesario? ¿se entiende rápido al leerlo?
3. Correctitud y bugs: errores lógicos, casos límite, concurrencia.
4. Seguridad: inyección, fuga de secretos, autenticación y permisos.
5. Manejo de errores y casos límite.
6. Tests: ¿hay pruebas correctas para los cambios?
7. Legibilidad/mantenibilidad y rendimiento.

Clasifica cada problema que encuentres por severidad, de forma ESTRICTA y CONSISTENTE:
- "critico": bug que rompe funcionalidad, vulnerabilidad de seguridad, fuga de secretos, o cualquier cosa que bloquee el merge.
- "mayor": problema notable que conviene resolver (diseño deficiente, validación ausente, manejo de errores pobre, deuda técnica relevante, regresión funcional, lógica nueva sin tests).
- "menor": mejora opcional no bloqueante (estilo, naming, micro-optimización, documentación).

Ejemplos de calibración (para anclar la severidad de forma consistente):
- "Concatena entrada del usuario en una query SQL sin parametrizar" => critico (seguridad).
- "Expone una clave/API key o secreto en el código" => critico (fuga de secretos).
- "No comprueba si el array está vacío antes de acceder a [0]" => mayor (caso límite no manejado).
- "Añade una rama de error nueva pero ningún test que la cubra" => mayor (tests ausentes en lógica relevante).
- "Abstracción genérica para un único caso de uso actual" => mayor (over-engineering).
- "Variable poco descriptiva como 'x' o falta un comentario" => menor (legibilidad).

Reglas obligatorias:
- Incluye SOLO problemas reales y concretos presentes en el diff; nada genérico ni especulativo. Prioriza precisión sobre exhaustividad (menos ruido, más señal).
- El mismo diff debe producir SIEMPRE la misma lista de problemas con la misma severidad. Sé reproducible y objetivo.
- Si el diff está truncado, evalúa solo lo visible y no penalices por lo que falte.
- "resumen_ejecutivo": 2 frases neutrales sobre qué hace el PR.
- NO asignes una puntuación numérica: la calcula el sistema a partir de tus problemas. Tu trabajo es detectarlos y clasificarlos correctamente.`;

// Esquema interno que rellena el modelo (no es el público).
// El modelo entrega problemas clasificados; la nota se deriva en código.
const ReviewModelSchema = z.object({
    resumen_ejecutivo: z.string().describe("Resumen de 2 frases de lo que hace el PR"),
    problemas: z
        .array(
            z.object({
                severidad: z.enum(["critico", "mayor", "menor"]),
                descripcion: z.string().describe("Problema concreto y real presente en el diff"),
            }),
        )
        .describe("Lista de problemas detectados; vacía si no hay ninguno"),
});

type ReviewProblema = z.infer<typeof ReviewModelSchema>["problemas"][number];

// Penalización por severidad sobre una base de 10.
const PENALIZACION: Record<ReviewProblema["severidad"], number> = {
    critico: 3,
    mayor: 1.5,
    menor: 0.5,
};

// Calcula la puntuación (1-10), la recomendación categórica y la aptitud para
// merge a partir de los problemas. Es una función pura y determinista:
// mismos problemas => mismo resultado.
export function computeScore(problemas: ReviewProblema[]): {
    puntuacion: number;
    apto: boolean;
    recomendacion: Recomendacion;
} {
    const criticos = problemas.filter((p) => p.severidad === "critico").length;
    const mayores = problemas.filter((p) => p.severidad === "mayor").length;
    const menores = problemas.filter((p) => p.severidad === "menor").length;

    const penalizacion = problemas.reduce(
        (acc, p) => acc + PENALIZACION[p.severidad],
        0,
    );

    // Redondeamos y acotamos al rango [1, 10]
    const puntuacion = Math.max(1, Math.min(10, Math.round(10 - penalizacion)));

    // Recomendación categórica (escala corta, más fiable que la nota holística):
    // se basa en la severidad más alta presente, no en un umbral numérico.
    let recomendacion: Recomendacion;
    if (criticos > 0) {
        recomendacion = "bloqueado";
    } else if (mayores > 0) {
        recomendacion = "cambios_mayores";
    } else if (menores > 0) {
        recomendacion = "cambios_menores";
    } else {
        recomendacion = "aprobar";
    }

    // Alineado con "mejora la salud del código" (Google): los problemas menores
    // no bloquean el merge; solo lo hacen críticos y mayores.
    const apto = criticos === 0 && mayores === 0;

    return { puntuacion, apto, recomendacion };
}

// Nº de ejecuciones del análisis para el ensemble (voto/mediana).
// Reduce la varianza entre sesiones. Configurable por entorno (AI_ENSEMBLE_RUNS).
const DEFAULT_ENSEMBLE_RUNS = 3;

// 2. Nuestro servicio principal
export class GitHubAIService {
    private octokit: Octokit;

    // Aceptamos el token, pero si no se pasa, funciona para repos públicos (con límite de peticiones).
    // aiOptions permite forzar proveedor/modelo/nº de ejecuciones; si se omite, se usa la config por entorno.
    constructor(
        private token?: string,
        private aiOptions?: {
            provider?: AIProvider;
            model?: string;
            ensembleRuns?: number;
        },
    ) {
        this.octokit = new Octokit({ auth: token });
    }

    // Obtener el diff (código añadido/borrado) de un PR
    async getPRDiff(owner: string, repo: string, prNumber: number): Promise<string> {
        const response = await this.octokit.pulls.get({
            owner,
            repo,
            pull_number: prNumber,
            mediaType: { format: "diff" }, // Mágia de Octokit para pedir el diff en texto plano
        });

        // El diff viene como string gigante
        return response.data as unknown as string;
    }

    // Comprueba que tenemos un token antes de llamar a endpoints que requieren un usuario autenticado.
    private requireAuth(accion: string): void {
        if (!this.token) {
            throw new Error(`Se requiere autenticación de GitHub para ${accion}.`);
        }
    }

    // Obtiene los datos del usuario autenticado (sirve para verificar el token y mostrar quién está logueado)
    async getAuthenticatedUser(): Promise<GitHubUser> {
        this.requireAuth("obtener tu usuario de GitHub");

        const { data } = await this.octokit.users.getAuthenticated();

        // Mapeamos solo los campos que necesitamos
        return {
            login: data.login,
            name: data.name ?? null,
            avatar_url: data.avatar_url,
        };
    }

    // Lista los repositorios del usuario autenticado, ordenados por última actualización
    async listUserRepos(): Promise<RepoSummary[]> {
        this.requireAuth("listar tus repositorios");

        const { data } = await this.octokit.repos.listForAuthenticatedUser({
            per_page: 100,
            sort: "updated",
        });

        // Mapeamos cada repo a su versión resumida
        return data.map((repo) => ({
            owner: repo.owner.login,
            name: repo.name,
            full_name: repo.full_name,
            private: repo.private,
            description: repo.description ?? null,
            updated_at: repo.updated_at ?? null,
        }));
    }

    // Lista los Pull Requests abiertos de un repositorio
    async listOpenPullRequests(owner: string, repo: string): Promise<PullSummary[]> {
        const { data } = await this.octokit.pulls.list({
            owner,
            repo,
            state: "open",
        });

        // Mapeamos cada PR a su versión resumida
        return data.map((pull) => ({
            number: pull.number,
            title: pull.title,
            author: pull.user?.login ?? null,
            created_at: pull.created_at,
            url: pull.html_url,
        }));
    }

    // Lista los Pull Requests abiertos en los repos del usuario autenticado
    // (los que tiene "pendientes de aceptar/revisar"). Usa la búsqueda de GitHub
    // para resolverlo en una sola petición en lugar de iterar repo por repo.
    async listPendingPullRequests(): Promise<PendingPR[]> {
        // getAuthenticatedUser ya valida que exista token y nos da el login
        const { login } = await this.getAuthenticatedUser();

        const { data } = await this.octokit.search.issuesAndPullRequests({
            q: `is:pr is:open archived:false user:${login}`,
            sort: "updated",
            order: "desc",
            per_page: 50,
        });

        return data.items.map((item) => {
            // repository_url tiene la forma https://api.github.com/repos/OWNER/REPO
            const segments = item.repository_url.split("/");
            const repo = segments.pop() ?? "";
            const owner = segments.pop() ?? "";

            return {
                owner,
                repo,
                full_name: `${owner}/${repo}`,
                number: item.number,
                title: item.title,
                author: item.user?.login ?? null,
                created_at: item.created_at,
                url: item.html_url,
                draft: item.draft ?? false,
            };
        });
    }

    // Una única revisión: pide al modelo los problemas y deriva el análisis.
    private async runReview(
        model: LanguageModel,
        diff: string,
    ): Promise<PRAnalysis> {
        const { object } = await generateObject({
            model,
            schema: ReviewModelSchema,
            // temperature 0 = detección (casi) determinista
            temperature: 0,
            // Los estándares van como `system` (estable); el diff como `prompt` (variable)
            system: SCORING_RUBRIC,
            prompt: `Detecta y clasifica los problemas del siguiente diff siguiendo los estándares.\n\nDiff:\n${diff}`,
        });

        // La nota y la recomendación las calcula el sistema (determinista).
        const { puntuacion, apto, recomendacion } = computeScore(object.problemas);

        return {
            resumen_ejecutivo: object.resumen_ejecutivo,
            // Prefijamos cada bug con su severidad para que sea visible en la UI
            posibles_bugs: object.problemas.map(
                (p) => `[${p.severidad}] ${p.descripcion}`,
            ),
            apto_para_merge: apto,
            puntuacion_codigo: puntuacion,
            recomendacion,
        };
    }

    // El método que une GitHub + IA.
    // Ejecuta el análisis varias veces (ensemble) y se queda con el resultado
    // de la MEDIANA por puntuación, lo que filtra ejecuciones atípicas y reduce
    // la varianza entre sesiones (práctica recomendada en LLM-as-a-judge).
    async analyzePR(owner: string, repo: string, prNumber: number): Promise<PRAnalysis> {
        console.log(`[Core] Descargando diff de ${owner}/${repo}#${prNumber}...`);
        const diff = await this.getPRDiff(owner, repo, prNumber);

        // Los modelos de IA tienen límite de texto. Si el PR es enorme, cortamos el diff para no saltarnos el límite
        const diffLimitado = diff.substring(0, 20000);

        if (diffLimitado.trim().length === 0) {
            throw new Error("El PR no tiene cambios de código (diff vacío).");
        }

        const model = resolveModel(this.aiOptions?.provider, this.aiOptions?.model);

        // Nº de ejecuciones: opción explícita > entorno > por defecto. Mínimo 1.
        const envRuns = Number(process.env.AI_ENSEMBLE_RUNS);
        const configuredRuns =
            this.aiOptions?.ensembleRuns ??
            (Number.isFinite(envRuns) && envRuns > 0
                ? envRuns
                : DEFAULT_ENSEMBLE_RUNS);
        const runs = Math.max(1, configuredRuns);
        console.log(`[Core] Analizando con ${runs} ejecución(es) (${diffLimitado.length} caracteres)...`);

        // Lanzamos las ejecuciones en paralelo; toleramos fallos parciales (p. ej.
        // sobrecarga puntual del proveedor) mientras al menos una tenga éxito.
        const settled = await Promise.allSettled(
            Array.from({ length: runs }, () => this.runReview(model, diffLimitado)),
        );

        const exitosas = settled
            .filter(
                (r): r is PromiseFulfilledResult<PRAnalysis> =>
                    r.status === "fulfilled",
            )
            .map((r) => r.value);

        if (exitosas.length === 0) {
            const motivo =
                settled[0]?.status === "rejected"
                    ? (settled[0] as PromiseRejectedResult).reason
                    : "desconocido";
            throw new Error(
                `No se pudo completar el análisis: ${motivo instanceof Error ? motivo.message : motivo}`,
            );
        }

        // Mediana por puntuación: ordenamos y tomamos el elemento central.
        exitosas.sort((a, b) => a.puntuacion_codigo - b.puntuacion_codigo);
        return exitosas[Math.floor(exitosas.length / 2)]!;
    }
}