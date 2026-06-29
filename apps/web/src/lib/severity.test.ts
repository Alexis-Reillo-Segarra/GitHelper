import { describe, it, expect } from "vitest";
import {
    agruparPorSeveridad,
    contarSeveridades,
    parseBug,
} from "./severity";

describe("parseBug", () => {
    it("extrae la severidad del prefijo y limpia la descripción", () => {
        expect(parseBug("[critico] Fuga de memoria")).toEqual({
            severidad: "critico",
            descripcion: "Fuga de memoria",
        });
    });

    it("es insensible a mayúsculas en el prefijo", () => {
        expect(parseBug("[MAYOR] x").severidad).toBe("mayor");
    });

    it("degrada con elegancia si no hay prefijo reconocible", () => {
        expect(parseBug("Bug sin clasificar")).toEqual({
            severidad: null,
            descripcion: "Bug sin clasificar",
        });
    });
});

describe("contarSeveridades", () => {
    it("cuenta por severidad e ignora las sin clasificar", () => {
        const bugs = ["[critico] a", "[critico] b", "[menor] c", "d"].map(parseBug);
        expect(contarSeveridades(bugs)).toEqual({ critico: 2, mayor: 0, menor: 1 });
    });
});

describe("agruparPorSeveridad", () => {
    it("ordena de más grave a menos y deja las sin clasificar al final", () => {
        const bugs = ["[menor] a", "[critico] b", "sin clasificar", "[mayor] c"].map(
            parseBug,
        );
        const grupos = agruparPorSeveridad(bugs);
        expect(grupos.map((g) => g.severidad)).toEqual([
            "critico",
            "mayor",
            "menor",
            null,
        ]);
    });

    it("omite los grupos vacíos", () => {
        const grupos = agruparPorSeveridad(["[menor] a"].map(parseBug));
        expect(grupos).toHaveLength(1);
        expect(grupos[0]!.severidad).toBe("menor");
    });
});
