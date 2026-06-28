import { describe, it, expect, beforeEach, vi } from "vitest";

// Mocks hoisteados (vi.mock se eleva por encima de los imports).
const { readConfigMock, analyzePRMock } = vi.hoisted(() => ({
    readConfigMock: vi.fn(),
    analyzePRMock: vi.fn(),
}));

vi.mock("@/lib/config", () => ({ readConfig: readConfigMock }));
vi.mock("@repo/core", () => ({
    GitHubAIService: vi.fn().mockImplementation(() => ({ analyzePR: analyzePRMock })),
}));

import { POST } from "./route";

const config = {
    githubToken: "ght",
    provider: "openai" as const,
    model: "gpt-4o-mini",
    aiKey: "sk-test",
};

const req = (body: unknown) =>
    new Request("http://localhost/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    });

beforeEach(() => {
    readConfigMock.mockReset();
    analyzePRMock.mockReset();
});

describe("POST /api/analyze", () => {
    it("401 si no hay configuración", async () => {
        readConfigMock.mockResolvedValue(null);
        const res = await POST(req({ owner: "a", repo: "b", pr: 1 }));
        expect(res.status).toBe(401);
    });

    it("400 con mensaje si el body no pasa la validación Zod", async () => {
        readConfigMock.mockResolvedValue(config);
        const res = await POST(req({ owner: "", repo: "b", pr: 1 }));
        expect(res.status).toBe(400);
        expect((await res.json()).message).toMatch(/owner/i);
    });

    it("200 con el análisis y coerciona el pr a número", async () => {
        readConfigMock.mockResolvedValue(config);
        const analysis = {
            resumen_ejecutivo: "x",
            posibles_bugs: [],
            apto_para_merge: true,
            puntuacion_codigo: 9,
            recomendacion: "aprobar",
        };
        analyzePRMock.mockResolvedValue(analysis);

        const res = await POST(req({ owner: "vercel", repo: "next.js", pr: "123" }));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual(analysis);
        expect(analyzePRMock).toHaveBeenCalledWith("vercel", "next.js", 123);
    });

    it("500 sin filtrar detalles si el servicio lanza", async () => {
        readConfigMock.mockResolvedValue(config);
        analyzePRMock.mockRejectedValue(new Error("fallo interno con datos sensibles"));
        const res = await POST(req({ owner: "a", repo: "b", pr: 1 }));
        expect(res.status).toBe(500);
        expect((await res.json()).message).toBe("Error interno del servidor");
    });
});
