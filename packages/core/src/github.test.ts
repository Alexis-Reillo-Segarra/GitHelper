import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GitHubClient, GitHubApiError } from "./github";
import { GitHubAIService } from "./index";

// Helper: respuesta simulada de fetch.
function mockResponse(
    body: unknown,
    { ok = true, status = 200, statusText = "OK", text = false } = {},
): Response {
    return {
        ok,
        status,
        statusText,
        json: async () => body,
        text: async () => (text ? (body as string) : JSON.stringify(body)),
    } as unknown as Response;
}

describe("GitHubClient", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("construye la URL con query y omite parámetros undefined", async () => {
        fetchMock.mockResolvedValue(mockResponse([]));
        const gh = new GitHubClient("tok");
        await gh.request("/user/repos", {
            query: { per_page: 100, sort: "updated", missing: undefined },
        });
        const url = fetchMock.mock.calls[0][0] as URL;
        expect(url.toString()).toBe(
            "https://api.github.com/user/repos?per_page=100&sort=updated",
        );
    });

    it("añade la cabecera Authorization cuando hay token", async () => {
        fetchMock.mockResolvedValue(mockResponse({}));
        await new GitHubClient("secret").request("/user");
        const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
            string,
            string
        >;
        expect(headers.Authorization).toBe("Bearer secret");
        expect(headers.Accept).toBe("application/vnd.github+json");
    });

    it("no añade Authorization sin token", async () => {
        fetchMock.mockResolvedValue(mockResponse({}));
        await new GitHubClient().request("/user");
        const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<
            string,
            string
        >;
        expect(headers.Authorization).toBeUndefined();
    });

    it("devuelve texto plano cuando raw=true (diff)", async () => {
        fetchMock.mockResolvedValue(
            mockResponse("diff --git a/x b/x", { text: true }),
        );
        const out = await new GitHubClient("t").request<string>("/repos/o/r/pulls/1", {
            accept: "application/vnd.github.diff",
            raw: true,
        });
        expect(out).toBe("diff --git a/x b/x");
    });

    it("lanza GitHubApiError con estado y mensaje de GitHub", async () => {
        fetchMock.mockResolvedValue(
            mockResponse({ message: "Bad credentials" }, {
                ok: false,
                status: 401,
                statusText: "Unauthorized",
            }),
        );
        const gh = new GitHubClient("bad");
        await expect(gh.request("/user")).rejects.toMatchObject({
            status: 401,
        });
        // El mensaje preserva estado + texto para la detección de auth en la UI.
        await expect(gh.request("/user")).rejects.toThrowError(/401.*Bad credentials/);
    });

    it("usa statusText si el cuerpo de error no es JSON", async () => {
        const res = {
            ok: false,
            status: 500,
            statusText: "Internal Server Error",
            json: async () => {
                throw new Error("no json");
            },
            text: async () => "",
        } as unknown as Response;
        fetchMock.mockResolvedValue(res);
        await expect(new GitHubClient().request("/x")).rejects.toBeInstanceOf(
            GitHubApiError,
        );
    });
});

describe("GitHubAIService (mapeo sobre fetch)", () => {
    let fetchMock: ReturnType<typeof vi.fn>;
    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    it("getAuthenticatedUser mapea solo los campos usados", async () => {
        fetchMock.mockResolvedValue(
            mockResponse({ login: "alex", name: null, avatar_url: "http://a", extra: 1 }),
        );
        const user = await new GitHubAIService("t").getAuthenticatedUser();
        expect(user).toEqual({ login: "alex", name: null, avatar_url: "http://a" });
    });

    it("getAuthenticatedUser exige token", async () => {
        await expect(new GitHubAIService().getAuthenticatedUser()).rejects.toThrow(
            /autenticación/i,
        );
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("getPullHeadSha extrae el sha de cabecera", async () => {
        fetchMock.mockResolvedValue(mockResponse({ head: { sha: "abc123" } }));
        const sha = await new GitHubAIService("t").getPullHeadSha("o", "r", 7);
        expect(sha).toBe("abc123");
        expect((fetchMock.mock.calls[0][0] as URL).pathname).toBe("/repos/o/r/pulls/7");
    });

    it("listPendingPullRequests deriva owner/repo de repository_url", async () => {
        // 1ª llamada: /user (login); 2ª: /search/issues
        fetchMock
            .mockResolvedValueOnce(
                mockResponse({ login: "alex", name: "Alex", avatar_url: "x" }),
            )
            .mockResolvedValueOnce(
                mockResponse({
                    items: [
                        {
                            number: 42,
                            title: "Fix bug",
                            created_at: "2024-01-01T00:00:00Z",
                            html_url: "http://pr/42",
                            repository_url: "https://api.github.com/repos/acme/widget",
                            draft: false,
                            user: { login: "bob" },
                        },
                    ],
                }),
            );
        const prs = await new GitHubAIService("t").listPendingPullRequests();
        expect(prs).toHaveLength(1);
        expect(prs[0]).toMatchObject({
            owner: "acme",
            repo: "widget",
            full_name: "acme/widget",
            number: 42,
            author: "bob",
        });
    });
});
