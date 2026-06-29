// Parseo del prefijo de severidad que el core añade a cada problema
// (`[critico] descripción`). Mantener la UI desacoplada de ese formato: si el
// core cambia el prefijo, solo se toca aquí. Funciones puras y testeables.

export type Severidad = "critico" | "mayor" | "menor";

export interface ParsedBug {
    severidad: Severidad | null;
    descripcion: string;
}

// Orden de presentación: lo más grave primero; lo sin clasificar, al final.
export const SEVERIDAD_ORDEN: Severidad[] = ["critico", "mayor", "menor"];

const PREFIJO = /^\s*\[(critico|mayor|menor)\]\s*/i;

// Separa la severidad de la descripción. Si no hay prefijo reconocible,
// devuelve la cadena íntegra con severidad nula (degradación elegante).
export function parseBug(raw: string): ParsedBug {
    const m = raw.match(PREFIJO);
    if (m) {
        return {
            severidad: m[1]!.toLowerCase() as Severidad,
            descripcion: raw.slice(m[0].length).trim(),
        };
    }
    return { severidad: null, descripcion: raw.trim() };
}

// Cuenta los problemas por severidad (los sin clasificar no se cuentan).
export function contarSeveridades(bugs: ParsedBug[]): Record<Severidad, number> {
    const out: Record<Severidad, number> = { critico: 0, mayor: 0, menor: 0 };
    for (const b of bugs) {
        if (b.severidad) out[b.severidad]++;
    }
    return out;
}

// Agrupa preservando el orden de severidad; los sin clasificar van al final.
export function agruparPorSeveridad(
    bugs: ParsedBug[],
): { severidad: Severidad | null; bugs: ParsedBug[] }[] {
    const grupos: { severidad: Severidad | null; bugs: ParsedBug[] }[] = [];
    for (const sev of SEVERIDAD_ORDEN) {
        const items = bugs.filter((b) => b.severidad === sev);
        if (items.length) grupos.push({ severidad: sev, bugs: items });
    }
    const sinClasificar = bugs.filter((b) => b.severidad === null);
    if (sinClasificar.length) grupos.push({ severidad: null, bugs: sinClasificar });
    return grupos;
}
