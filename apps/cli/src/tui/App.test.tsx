import { describe, it, expect } from "vitest";
import { render } from "ink-testing-library";
import { App } from "./App";

describe("TUI App", () => {
    it("renderiza la cabecera con el nombre del producto", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        expect(lastFrame() ?? "").toContain("Git-Helper");
        unmount();
    });

    it("muestra el onboarding de token cuando no hay GITHUB_TOKEN", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        const out = lastFrame() ?? "";
        expect(out).toContain("Configura tu token de GitHub");
        expect(out).toContain("GITHUB_TOKEN");
        unmount();
    });

    it("muestra los atajos de la barra de estado", () => {
        const { lastFrame, unmount } = render(<App token={undefined} />);
        expect(lastFrame() ?? "").toContain("guardar");
        unmount();
    });
});
