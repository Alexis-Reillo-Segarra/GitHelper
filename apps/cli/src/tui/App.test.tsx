import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App";

// Entorno limpio: sin proveedor, clave ni token → debe arrancar el wizard.
beforeEach(() => {
    vi.stubEnv("AI_PROVIDER", "");
    vi.stubEnv("GITHUB_TOKEN", "");
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("TUI App", () => {
    it("renderiza la cabecera con el nombre del producto", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        expect(lastFrame() ?? "").toContain("Git-Helper");
        unmount();
    });

    it("arranca el asistente eligiendo el proveedor de IA", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        const out = lastFrame() ?? "";
        expect(out).toContain("Elige tu proveedor de IA");
        expect(out).toContain("Gemini");
        expect(out).toContain("Claude");
        unmount();
    });

    it("muestra el indicador de pasos del asistente", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        expect(lastFrame() ?? "").toContain("paso 1/3");
        unmount();
    });

    it("da la bienvenida en el primer arranque", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        expect(lastFrame() ?? "").toContain("¡Bienvenido!");
        unmount();
    });

    it("muestra el modelo del proveedor resaltado en el selector", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        // Gemini va primero: su modelo por defecto debe verse como detalle.
        expect(lastFrame() ?? "").toContain("gemini-2.5-flash");
        unmount();
    });

    it("muestra atajos de teclado acordes al paso de selección", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        const out = lastFrame() ?? "";
        expect(out).toContain("elegir");
        expect(out).toContain("continuar");
        unmount();
    });

    it("tras elegir un proveedor con varios modelos, ofrece seleccionar el modelo", async () => {
        const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
        const { lastFrame, stdin, unmount } = render(<App token={undefined} />);
        stdin.write("\r"); // selecciona Gemini (primer proveedor, 2 modelos)
        await sleep(40);
        const out = lastFrame() ?? "";
        expect(out).toContain("Elige el modelo de Gemini");
        expect(out).toContain("Gemini 2.5 Flash");
        expect(out).toContain("Gemini 2.5 Pro");
        unmount();
    });
});
