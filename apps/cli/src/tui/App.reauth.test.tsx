import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "ink-testing-library";

// Mock de @repo/core: GitHubAIService falla con un 401 de GitHub al listar
// (lo que produce el cliente real ante un token caducado), conservando el resto
// de exports reales (AI_PROVIDERS, getProvider, GitHubApiError, …).
vi.mock("@repo/core", async (importActual) => {
    const actual = await importActual<typeof import("@repo/core")>();
    return {
        ...actual,
        GitHubAIService: class {
            async listPendingPullRequests(): Promise<never> {
                throw new actual.GitHubApiError(401, "GitHub API 401: Bad credentials");
            }
            async analyzePR(): Promise<never> {
                throw new Error("no debería llamarse en este test");
            }
        },
    };
});

// Importamos App DESPUÉS de declarar el mock.
const { App } = await import("./App");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Estado de un usuario ya configurado pero con el token de GitHub caducado.
beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-demo-key");
    vi.stubEnv("GITHUB_TOKEN", "ghp_token_caducado");
});
afterEach(() => vi.unstubAllEnvs());

describe("Re-autenticación automática", () => {
    it("al detectar el token de GitHub inválido, relanza el asistente pidiéndolo de nuevo", async () => {
        const { lastFrame, unmount } = render(<App token="ghp_token_caducado" />);
        // Esperamos a que la carga falle y la app reaccione.
        await sleep(50);
        const out = lastFrame() ?? "";
        expect(out).toContain("no es válido o ha caducado");
        expect(out).toContain("Conecta tu cuenta de GitHub");
        // No vuelve a pedir el proveedor de IA (ese seguía siendo válido).
        expect(out).not.toContain("Elige tu proveedor de IA");
        unmount();
    });
});
