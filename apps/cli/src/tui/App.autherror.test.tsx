import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "ink-testing-library";

// Mock de @repo/core: la lista trae un PR y el análisis falla con un 403 de
// GitHub (p. ej. rate-limit). Un 403 NO es un fallo de credenciales ni de la
// clave de IA: debe mostrarse el error tal cual, sin relanzar ningún asistente.
vi.mock("@repo/core", async (importActual) => {
    const actual = await importActual<typeof import("@repo/core")>();
    return {
        ...actual,
        GitHubAIService: class {
            async listPendingPullRequests() {
                return [
                    {
                        owner: "acme",
                        repo: "widget",
                        full_name: "acme/widget",
                        number: 42,
                        title: "Fix bug",
                        author: "bob",
                        created_at: new Date().toISOString(),
                        url: "http://pr/42",
                        draft: false,
                    },
                ];
            }
            async analyzePR(): Promise<never> {
                throw new actual.GitHubApiError(
                    403,
                    "GitHub API 403: API rate limit exceeded",
                );
            }
        },
    };
});

const { App } = await import("./App");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Usuario completamente configurado (proveedor + clave + token válidos).
beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "sk-demo-key");
    vi.stubEnv("GITHUB_TOKEN", "ghp_token_valido");
});
afterEach(() => vi.unstubAllEnvs());

describe("Enrutado de errores de GitHub vs IA", () => {
    it("un 403 de GitHub al analizar se muestra como error, sin pedir la clave de IA ni el token", async () => {
        const { lastFrame, stdin, unmount } = render(<App token="ghp_token_valido" />);
        await sleep(50); // carga de la lista
        stdin.write("\r"); // analiza el PR seleccionado
        await sleep(50); // el análisis falla con 403

        const out = lastFrame() ?? "";
        // Se muestra el error real de GitHub…
        expect(out).toContain("rate limit");
        // …y NO se relanza el asistente de la clave de IA…
        expect(out).not.toContain("API key de tu proveedor de IA");
        expect(out).not.toContain("Configura tu clave");
        // …ni el de re-introducir el token de GitHub (403 ≠ credenciales).
        expect(out).not.toContain("no es válido o ha caducado");
        expect(out).not.toContain("Conecta tu cuenta de GitHub");
        unmount();
    });
});
