import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    test: {
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        exclude: ["e2e/**", "node_modules/**", ".next/**"],
        // Por defecto node (unit/route); los tests de componente (.tsx) usan jsdom.
        environment: "node",
        environmentMatchGlobs: [["src/**/*.test.tsx", "jsdom"]],
    },
});
