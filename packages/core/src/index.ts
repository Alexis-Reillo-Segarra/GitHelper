import { Octokit } from "@octokit/rest";
import { generateObject, type LanguageModel } from "ai";
import { openai } from "@ai-sdk/openai";
import { google } from "@ai-sdk/google";
import { z } from "zod";

// 1. Cómo queremos que la IA nos devuelva los datos
export const PRAnalysisSchema = z.object({
    resumen_ejecutivo: z.string().describe("Resumen de 2 frases de lo que hace el PR"),
    posibles_bugs: z.array(z.string()).describe("Lista de posibles bugs o errores lógicos"),
    apto_para_merge: z.boolean().describe("True si no hay bugs críticos"),
    puntuacion_codigo: z.number().min(1).max(10).describe("Puntuación de calidad del 1 al 10"),
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

// 1.b Selección del proveedor de IA.
// Se elige con la variable de entorno AI_PROVIDER ("gemini" | "openai").
// El modelo concreto se puede sobreescribir con AI_MODEL.
export type AIProvider = "gemini" | "openai";

const DEFAULT_MODELS: Record<AIProvider, string> = {
    gemini: "gemini-2.5-flash", // Rápido y con free tier en Google AI Studio
    openai: "gpt-4o-mini",      // Rápido y barato
};

export function resolveModel(provider?: AIProvider, model?: string): LanguageModel {
    // Prioridad: argumento explícito > variable de entorno > "gemini" por defecto
    const selected = (provider ?? process.env.AI_PROVIDER ?? "gemini").toLowerCase();
    const modelName = model ?? process.env.AI_MODEL;

    switch (selected) {
        case "gemini":
        case "google":
            // Validamos que exista la API key de Google antes de crear el modelo
            if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
                throw new Error(
                    'Falta la variable de entorno GOOGLE_GENERATIVE_AI_API_KEY requerida para el proveedor "gemini".',
                );
            }
            return google(modelName ?? DEFAULT_MODELS.gemini);
        case "openai":
            // Validamos que exista la API key de OpenAI antes de crear el modelo
            if (!process.env.OPENAI_API_KEY) {
                throw new Error(
                    'Falta la variable de entorno OPENAI_API_KEY requerida para el proveedor "openai".',
                );
            }
            return openai(modelName ?? DEFAULT_MODELS.openai);
        default:
            throw new Error(
                `AI_PROVIDER desconocido: "${selected}". Valores válidos: "gemini" u "openai".`,
            );
    }
}

// 2. Nuestro servicio principal
export class GitHubAIService {
    private octokit: Octokit;

    // Aceptamos el token, pero si no se pasa, funciona para repos públicos (con límite de peticiones).
    // aiOptions permite forzar proveedor/modelo; si se omite, se usa la configuración por entorno.
    constructor(
        private token?: string,
        private aiOptions?: { provider?: AIProvider; model?: string },
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

    // El método que une GitHub + IA
    async analyzePR(owner: string, repo: string, prNumber: number): Promise<PRAnalysis> {
        console.log(`[Core] Descargando diff de ${owner}/${repo}#${prNumber}...`);
        const diff = await this.getPRDiff(owner, repo, prNumber);

        // Los modelos de IA tienen límite de texto. Si el PR es enorme, cortamos el diff para no saltarnos el límite
        const diffLimitado = diff.substring(0, 20000);

        if (diffLimitado.trim().length === 0) {
            throw new Error("El PR no tiene cambios de código (diff vacío).");
        }

        const model = resolveModel(this.aiOptions?.provider, this.aiOptions?.model);
        console.log(`[Core] Enviando a la IA (${diffLimitado.length} caracteres)...`);

        const { object } = await generateObject({
            model,
            schema: PRAnalysisSchema,
            prompt: `Eres un ingeniero de software Senior revisando un Pull Request.
      Analiza el siguiente diff de código y devuelve el análisis estructurado.
      Sé estricto buscando bugs. Diff:
      ${diffLimitado}`,
        });

        return object;
    }
}