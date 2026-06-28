import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { PRAnalysis } from "@repo/core";
import { checkA11y } from "@/test/a11y";
import { ResultCard } from "./ResultCard";

const base: PRAnalysis = {
    resumen_ejecutivo: "Este PR hace X e Y.",
    posibles_bugs: [],
    apto_para_merge: true,
    puntuacion_codigo: 9,
    recomendacion: "aprobar",
};

describe("ResultCard", () => {
    it("muestra la puntuación y el resumen", () => {
        render(<ResultCard result={base} />);
        expect(screen.getByText("9/10")).toBeInTheDocument();
        expect(screen.getByText(/Este PR hace X e Y\./)).toBeInTheDocument();
    });

    it("muestra la etiqueta correcta según la recomendación", () => {
        render(<ResultCard result={{ ...base, recomendacion: "bloqueado" }} />);
        expect(screen.getByText("Bloqueado")).toBeInTheDocument();
    });

    it("lista los problemas detectados cuando los hay", () => {
        render(<ResultCard result={{ ...base, posibles_bugs: ["Bug A", "Bug B"] }} />);
        expect(screen.getByText("Problemas detectados")).toBeInTheDocument();
        expect(screen.getByText("Bug A")).toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    it("oculta la sección de problemas si no hay bugs", () => {
        render(<ResultCard result={base} />);
        expect(screen.queryByText("Problemas detectados")).toBeNull();
    });

    it("no tiene violaciones de accesibilidad", async () => {
        const { container } = render(
            <ResultCard result={{ ...base, posibles_bugs: ["Bug A"] }} />,
        );
        const results = await checkA11y(container);
        expect(results.violations).toEqual([]);
    });
});
