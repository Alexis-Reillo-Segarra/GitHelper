import type { ReactNode } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { checkA11y } from "@/test/a11y";
import { SessionBar } from "./SessionBar";

// "Cerrar sesión" usa el server action clearConfig; lo stubbeamos.
vi.mock("@/app/actions", () => ({ clearConfig: vi.fn() }));
// next/link necesita el contexto del App Router para navegar; en test lo
// reemplazamos por un <a> simple.
vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: { href: string; children: ReactNode }) => (
        <a href={href} {...props}>
            {children}
        </a>
    ),
}));

describe("SessionBar", () => {
    it("muestra el nombre y el botón de cerrar sesión", () => {
        render(<SessionBar name="Alexis" image={null} />);
        expect(screen.getByText("Alexis")).toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /cerrar sesión/i }),
        ).toBeInTheDocument();
    });

    it("usa el avatar con alt accesible cuando hay imagen", () => {
        render(<SessionBar name="Alexis" image="https://example.com/a.png" />);
        const img = screen.getByRole("img", { name: "Alexis" });
        expect(img).toHaveAttribute("src", "https://example.com/a.png");
    });

    it("muestra la inicial en mayúscula cuando no hay imagen", () => {
        render(<SessionBar name="bruno" image={null} />);
        expect(screen.getByText("B")).toBeInTheDocument();
    });

    it("muestra el modelo del proveedor de IA activo", () => {
        render(
            <SessionBar
                name="Alexis"
                image={null}
                provider="anthropic"
                model="claude-haiku-4-5-20251001"
            />,
        );
        expect(screen.getByText("claude-haiku-4-5-20251001")).toBeInTheDocument();
    });

    it("no tiene violaciones de accesibilidad", async () => {
        const { container } = render(
            <SessionBar
                name="Alexis"
                image="https://example.com/a.png"
                provider="openai"
                model="gpt-4o-mini"
            />,
        );
        const results = await checkA11y(container);
        expect(results.violations).toEqual([]);
    });
});
