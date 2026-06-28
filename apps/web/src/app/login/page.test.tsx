import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import LoginPage from "./page";

// El botón de login dispara signIn (OAuth); lo stubbeamos.
// La a11y de esta página completa se cubre en e2e (no se duplica aquí).
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));

describe("LoginPage", () => {
    it("muestra el encabezado del producto", () => {
        render(<LoginPage />);
        expect(
            screen.getByRole("heading", { name: /GitHub AI Helper/i }),
        ).toBeInTheDocument();
    });

    it("ofrece el botón de continuar con GitHub", () => {
        render(<LoginPage />);
        expect(
            screen.getByRole("button", { name: /Continuar con GitHub/i }),
        ).toBeInTheDocument();
    });
});
