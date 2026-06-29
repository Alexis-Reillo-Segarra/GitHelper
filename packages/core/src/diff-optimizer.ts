// Optimización de tokens: poda del diff antes de enviarlo al modelo de IA.
//
// El análisis lanza un ENSEMBLE de N ejecuciones (CLI por defecto 3) y cada una
// envía el diff completo al proveedor. El coste en tokens —y por tanto la
// factura— se multiplica por N. Gran parte de un diff típico es ruido que no
// aporta NADA a una revisión de código: lockfiles (un `pnpm-lock.yaml` puede ser
// el 90% del diff), ficheros generados o vendorizados, assets minificados,
// binarios y snapshots. Esta función los poda de forma DETERMINISTA (mismo diff
// => mismo resultado), conservando solo el código realmente revisable.
//
// Es una función pura, sin dependencias del proveedor de IA: el ahorro aplica a
// cualquier modelo y se multiplica por el número de ejecuciones del ensemble.

// Motivo por el que se omite un fichero del diff (para reporting/UX).
export type MotivoOmision = "lockfile" | "generado" | "minificado" | "binario" | "snapshot";

export type ArchivoOmitido = {
    path: string;
    motivo: MotivoOmision;
};

export type DiffOptimizado = {
    /** Diff podado, listo para enviar al modelo (incluye la nota resumen si hubo omisiones). */
    diff: string;
    /** Ficheros omitidos, con su motivo. */
    omitidos: ArchivoOmitido[];
    /** Caracteres del diff original. */
    charsOriginal: number;
    /** Caracteres del diff podado (incluida la nota resumen). */
    charsOptimizado: number;
};

// Lockfiles: enormes, autogenerados y sin valor para una revisión de código.
// La comparación es por nombre de fichero (basename), en minúsculas.
const LOCKFILES = new Set([
    "pnpm-lock.yaml",
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "bun.lockb",
    "cargo.lock",
    "poetry.lock",
    "pipfile.lock",
    "gemfile.lock",
    "composer.lock",
    "go.sum",
    "flake.lock",
]);

// Segmentos de ruta de código generado o de dependencias vendorizadas.
const SEGMENTOS_GENERADOS = [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "out/",
    "coverage/",
    "vendor/",
    ".turbo/",
];

// Clasifica un fichero: devuelve el motivo de omisión o `null` si debe revisarse.
function clasificarPath(path: string, esBinario: boolean): MotivoOmision | null {
    const lower = path.toLowerCase();
    const base = lower.split("/").pop() ?? lower;

    if (LOCKFILES.has(base)) return "lockfile";
    if (base.endsWith(".snap") || lower.includes("__snapshots__/")) return "snapshot";
    if (base.endsWith(".min.js") || base.endsWith(".min.css") || base.endsWith(".map")) {
        return "minificado";
    }
    if (SEGMENTOS_GENERADOS.some((seg) => lower.includes(seg))) return "generado";
    // El binario va el último: un lockfile binario (bun.lockb) se reporta como lockfile.
    if (esBinario) return "binario";
    return null;
}

// Extrae la ruta del fichero de un bloque del diff. Prefiere el destino (`b/`).
function extraerPath(bloque: string): string | null {
    // `diff --git a/<path> b/<path>` — usamos el destino, salvo borrados (b/ ausente).
    const git = bloque.match(/^diff --git a\/(.+?) b\/(.+)$/m);
    if (git) return git[2] ?? git[1] ?? null;
    // Respaldo: cabecera `+++ b/<path>`.
    const masmas = bloque.match(/^\+\+\+ b\/(.+)$/m);
    if (masmas) return masmas[1] ?? null;
    return null;
}

// Poda el ruido no revisable de un diff de GitHub (formato unified).
export function optimizeDiff(diff: string): DiffOptimizado {
    const charsOriginal = diff.length;

    // Cada fichero del diff empieza con una línea `diff --git a/… b/…`. Partimos
    // por esos encabezados conservando el delimitador (lookahead).
    const partes = diff.split(/(?=^diff --git )/m);

    const conservados: string[] = [];
    const omitidos: ArchivoOmitido[] = [];

    for (const bloque of partes) {
        if (!bloque.startsWith("diff --git")) {
            // Preámbulo o fragmento sin encabezado: lo conservamos por seguridad.
            if (bloque.trim().length > 0) conservados.push(bloque);
            continue;
        }

        const path = extraerPath(bloque);
        const esBinario =
            /^Binary files .* differ$/m.test(bloque) || bloque.includes("GIT binary patch");
        const motivo = path ? clasificarPath(path, esBinario) : null;

        if (motivo) {
            omitidos.push({ path: path ?? "(desconocido)", motivo });
        } else {
            conservados.push(bloque);
        }
    }

    let resultado = conservados.join("").trimEnd();

    // Si omitimos ficheros, dejamos una nota compacta para que el modelo sepa que
    // el PR incluye más cambios (no revisables) y no infiera que es menor de lo
    // que es. Cuesta pocos tokens y evita conclusiones engañosas.
    if (omitidos.length > 0) {
        const lista = omitidos.map((o) => `${o.path} (${o.motivo})`).join(", ");
        const prefijo = resultado.length > 0 ? "\n\n" : "";
        resultado += `${prefijo}# Nota: ${omitidos.length} archivo(s) omitido(s) por el optimizador de tokens (no requieren revisión): ${lista}`;
    }

    return {
        diff: resultado,
        omitidos,
        charsOriginal,
        charsOptimizado: resultado.length,
    };
}
