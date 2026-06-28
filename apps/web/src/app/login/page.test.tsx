import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

// El asistente envía la configuración con el server action saveConfig; lo
// stubbeamos. La a11y de la página completa se cubre en e2e (no se duplica aquí).
vi.mock("@/app/actions", () => ({ saveConfig: vi.fn() }));

describe("LoginPage", () => {
    it("muestra el encabezado del producto", () => {
        render(<LoginPage />);
        expect(
            screen.getByRole("heading", { name: /GitHub AI Helper/i }),
        ).toBeInTheDocument();
    });

    it("ofrece el selector de proveedor de IA", () => {
        render(<LoginPage />);
        expect(
            screen.getByRole("heading", { name: /Elige tu proveedor de IA/i }),
        ).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /OpenAI/i })).toBeInTheDocument();
    });
});
