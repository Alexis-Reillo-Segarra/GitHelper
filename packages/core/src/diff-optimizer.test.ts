import { describe, it, expect } from "vitest";
import { optimizeDiff } from "./diff-optimizer";

// Bloque de diff de un fichero de código normal (debe conservarse).
const SRC = `diff --git a/src/app.ts b/src/app.ts
index 1111111..2222222 100644
--- a/src/app.ts
+++ b/src/app.ts
@@ -1,3 +1,4 @@
 export function suma(a: number, b: number) {
-    return a + b;
+    return a + b + 1;
 }
`;

const LOCKFILE = `diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
index 3333333..4444444 100644
--- a/pnpm-lock.yaml
+++ b/pnpm-lock.yaml
@@ -1,5 +1,5 @@
-  resolution: {integrity: sha512-aaa}
+  resolution: {integrity: sha512-bbb}
`;

const GENERADO = `diff --git a/dist/bundle.js b/dist/bundle.js
index 5555555..6666666 100644
--- a/dist/bundle.js
+++ b/dist/bundle.js
@@ -1 +1 @@
-console.log(1)
+console.log(2)
`;

const MINIFICADO = `diff --git a/public/app.min.js b/public/app.min.js
index 7777777..8888888 100644
--- a/public/app.min.js
+++ b/public/app.min.js
@@ -1 +1 @@
-var a=1
+var a=2
`;

const SNAPSHOT = `diff --git a/src/__snapshots__/c.test.ts.snap b/src/__snapshots__/c.test.ts.snap
index 9999999..aaaaaaa 100644
--- a/src/__snapshots__/c.test.ts.snap
+++ b/src/__snapshots__/c.test.ts.snap
@@ -1 +1 @@
-exports[\`x\`] = 1
+exports[\`x\`] = 2
`;

const BINARIO = `diff --git a/assets/logo.png b/assets/logo.png
index bbbbbbb..ccccccc 100644
Binary files a/assets/logo.png and b/assets/logo.png differ
`;

describe("optimizeDiff", () => {
    it("conserva intacto un diff de solo código", () => {
        const r = optimizeDiff(SRC);
        expect(r.omitidos).toEqual([]);
        expect(r.diff).toBe(SRC.trimEnd());
    });

    it("omite lockfiles y conserva el código", () => {
        const r = optimizeDiff(LOCKFILE + SRC);
        expect(r.omitidos).toEqual([{ path: "pnpm-lock.yaml", motivo: "lockfile" }]);
        expect(r.diff).toContain("src/app.ts");
        expect(r.diff).not.toContain("resolution");
    });

    it("clasifica cada tipo de ruido con su motivo", () => {
        const r = optimizeDiff(LOCKFILE + GENERADO + MINIFICADO + SNAPSHOT + BINARIO + SRC);
        expect(r.omitidos).toEqual([
            { path: "pnpm-lock.yaml", motivo: "lockfile" },
            { path: "dist/bundle.js", motivo: "generado" },
            { path: "public/app.min.js", motivo: "minificado" },
            { path: "src/__snapshots__/c.test.ts.snap", motivo: "snapshot" },
            { path: "assets/logo.png", motivo: "binario" },
        ]);
        expect(r.diff).toContain("src/app.ts");
    });

    it("añade una nota resumen cuando hay omisiones", () => {
        const r = optimizeDiff(LOCKFILE + SRC);
        expect(r.diff).toContain("# Nota:");
        expect(r.diff).toContain("pnpm-lock.yaml (lockfile)");
    });

    it("no añade nota si no se omite nada", () => {
        const r = optimizeDiff(SRC);
        expect(r.diff).not.toContain("# Nota:");
    });

    it("reporta el ahorro real de caracteres", () => {
        const r = optimizeDiff(LOCKFILE + SRC);
        expect(r.charsOriginal).toBe((LOCKFILE + SRC).length);
        // El podado (sin el lockfile) ocupa menos que el original.
        expect(r.charsOptimizado).toBeLessThan(r.charsOriginal);
    });

    it("es determinista: misma entrada => misma salida", () => {
        const entrada = GENERADO + SRC + LOCKFILE;
        expect(optimizeDiff(entrada)).toEqual(optimizeDiff(entrada));
    });

    it("un diff vacío produce un resultado vacío sin omisiones", () => {
        const r = optimizeDiff("");
        expect(r.diff).toBe("");
        expect(r.omitidos).toEqual([]);
        expect(r.charsOriginal).toBe(0);
    });

    it("un PR de solo lockfile deja únicamente la nota (nada que revisar)", () => {
        const r = optimizeDiff(LOCKFILE);
        expect(r.omitidos).toHaveLength(1);
        expect(r.diff.startsWith("# Nota:")).toBe(true);
    });
});
