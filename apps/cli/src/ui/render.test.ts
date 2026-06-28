import { describe, it, expect } from "vitest";
import { wrap } from "./render";

describe("wrap", () => {
    it("deja intacto un texto que cabe en el ancho", () => {
        expect(wrap("hola mundo", 20)).toEqual(["hola mundo"]);
    });

    it("parte por palabras sin exceder el ancho", () => {
        expect(wrap("uno dos tres cuatro", 7)).toEqual(["uno dos", "tres", "cuatro"]);
    });

    it("no corta palabras más largas que el ancho", () => {
        expect(wrap("superlargapalabra ok", 5)).toEqual(["superlargapalabra", "ok"]);
    });

    it("ninguna línea supera el ancho salvo palabras indivisibles", () => {
        for (const line of wrap("el pulpo lleva un casco de obra morado", 10)) {
            const soloUnaPalabra = !line.includes(" ");
            expect(line.length <= 10 || soloUnaPalabra).toBe(true);
        }
    });
});
