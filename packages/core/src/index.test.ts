import { describe, it, expect } from "vitest";
import { computeScore, PRAnalysisSchema, RECOMENDACIONES } from "./index";

describe("computeScore", () => {
    it("sin problemas: nota 10, apto para merge y aprobar", () => {
        expect(computeScore([])).toEqual({
            puntuacion: 10,
            apto: true,
            recomendacion: "aprobar",
        });
    });

    it("un problema menor (0.5) redondea a 10 y no bloquea el merge", () => {
        expect(computeScore([{ severidad: "menor", descripcion: "naming" }])).toEqual({
            puntuacion: 10,
            apto: true,
            recomendacion: "cambios_menores",
        });
    });

    it("dos menores penalizan 1 punto: nota 9", () => {
        expect(
            computeScore([
                { severidad: "menor", descripcion: "a" },
                { severidad: "menor", descripcion: "b" },
            ]),
        ).toEqual({ puntuacion: 9, apto: true, recomendacion: "cambios_menores" });
    });

    it("un problema mayor (1.5) baja a 9 y marca NO apto", () => {
        expect(computeScore([{ severidad: "mayor", descripcion: "sin validación" }])).toEqual({
            puntuacion: 9,
            apto: false,
            recomendacion: "cambios_mayores",
        });
    });

    it("un crítico (3) baja a 7 y bloquea el merge", () => {
        expect(computeScore([{ severidad: "critico", descripcion: "fuga de secreto" }])).toEqual({
            puntuacion: 7,
            apto: false,
            recomendacion: "bloqueado",
        });
    });

    it("acota la nota a un mínimo de 1 aunque haya muchos críticos", () => {
        const many = Array.from({ length: 5 }, (_, i) => ({
            severidad: "critico" as const,
            descripcion: `bug ${i}`,
        }));
        expect(computeScore(many).puntuacion).toBe(1);
    });

    it("la severidad más alta presente decide la recomendación", () => {
        expect(
            computeScore([
                { severidad: "critico", descripcion: "a" },
                { severidad: "mayor", descripcion: "b" },
                { severidad: "menor", descripcion: "c" },
            ]).recomendacion,
        ).toBe("bloqueado");
    });

    it("es determinista: misma entrada produce misma salida", () => {
        const problemas = [
            { severidad: "mayor" as const, descripcion: "a" },
            { severidad: "menor" as const, descripcion: "b" },
        ];
        expect(computeScore(problemas)).toEqual(computeScore(problemas));
    });
});

describe("PRAnalysisSchema", () => {
    const valido = {
        resumen_ejecutivo: "Hace X.",
        posibles_bugs: [],
        apto_para_merge: true,
        puntuacion_codigo: 8,
        recomendacion: "aprobar" as const,
    };

    it("acepta un análisis válido", () => {
        expect(PRAnalysisSchema.parse(valido)).toEqual(valido);
    });

    it("rechaza una puntuación fuera de rango (>10)", () => {
        expect(() => PRAnalysisSchema.parse({ ...valido, puntuacion_codigo: 11 })).toThrow();
    });

    it("rechaza una recomendación desconocida", () => {
        expect(() => PRAnalysisSchema.parse({ ...valido, recomendacion: "quizas" })).toThrow();
    });
});

describe("RECOMENDACIONES", () => {
    it("expone las cuatro categorías en orden de severidad", () => {
        expect(RECOMENDACIONES).toEqual([
            "aprobar",
            "cambios_menores",
            "cambios_mayores",
            "bloqueado",
        ]);
    });
});
