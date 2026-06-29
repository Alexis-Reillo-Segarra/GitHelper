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
    it("muestra la puntuación (gauge accesible) y el resumen", () => {
        render(<ResultCard result={base} />);
        expect(
            screen.getByRole("img", { name: /Puntuación 9 de 10/ }),
        ).toBeInTheDocument();
        expect(screen.getByText(/Este PR hace X e Y\./)).toBeInTheDocument();
    });

    it("muestra la etiqueta correcta según la recomendación", () => {
        render(<ResultCard result={{ ...base, recomendacion: "bloqueado" }} />);
        expect(screen.getByText("Bloqueado")).toBeInTheDocument();
    });

    it("indica la aptitud para merge", () => {
        render(<ResultCard result={base} />);
        expect(screen.getByText("Apto para merge")).toBeInTheDocument();

        render(<ResultCard result={{ ...base, apto_para_merge: false }} />);
        expect(screen.getByText("No apto para merge")).toBeInTheDocument();
    });

    it("lista los problemas detectados cuando los hay", () => {
        render(<ResultCard result={{ ...base, posibles_bugs: ["Bug A", "Bug B"] }} />);
        expect(screen.getByText("Problemas detectados")).toBeInTheDocument();
        expect(screen.getByText("Bug A")).toBeInTheDocument();
        expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    it("agrupa los problemas por severidad y limpia el prefijo", () => {
        render(
            <ResultCard
                result={{
                    ...base,
                    posibles_bugs: ["[critico] Fuga de memoria", "[menor] Typo en log"],
                }}
            />,
        );
        // Cabeceras de grupo por severidad.
        expect(screen.getByText("Crítico")).toBeInTheDocument();
        expect(screen.getByText("Menor")).toBeInTheDocument();
        // El prefijo `[critico]` no debe aparecer en la descripción.
        expect(screen.getByText("Fuga de memoria")).toBeInTheDocument();
        expect(screen.queryByText(/\[critico\]/)).toBeNull();
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
