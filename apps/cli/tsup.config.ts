import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    // ESM: la TUI usa Ink (ESM puro). El paquete es un binario (bin), no una
    // librería, así que ESM es correcto y Node 18+ lo ejecuta sin problemas.
    format: ["esm"],
    target: "node18",
    platform: "node",
    // Bundlea @repo/core (workspace) dentro del CLI para que el paquete publicado
    // sea autocontenido y no dependa de "workspace:*". Las libs npm pesadas
    // (ai, @ai-sdk/*, @octokit/rest, zod, commander, dotenv) se quedan como
    // dependencias externas declaradas en package.json -> dependencies.
    noExternal: ["@repo/core"],
    clean: true,
    sourcemap: false,
    // Preserva el shebang del entry para que dist/index.js sea ejecutable.
    banner: { js: "#!/usr/bin/env node" },
});
