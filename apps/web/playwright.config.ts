import { defineConfig, devices } from "@playwright/test";

// E2E de flujos PÚBLICOS/deterministas (sin credenciales reales): redirección de
// protección y asistente de configuración, con a11y de página completa
// (contraste incluido, navegador real). Los flujos configurados se cubren a
// nivel de componente.
export default defineConfig({
    testDir: "./e2e",
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? "list" : "html",
    use: {
        baseURL: "http://localhost:3000",
        trace: "on-first-retry",
    },
    projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
    webServer: {
        command: "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
        // La app arranca sin credenciales: el proxy redirige al asistente y el
        // asistente no contacta con ningún servicio hasta que el usuario envía
        // sus claves, así que no hace falta ninguna variable de entorno.
    },
});
