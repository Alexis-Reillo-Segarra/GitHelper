import { defineConfig, devices } from "@playwright/test";

// E2E de flujos PÚBLICOS/deterministas (sin OAuth real): redirección de
// protección y página de login, con a11y de página completa (contraste incluido,
// navegador real). Los flujos autenticados se cubren a nivel de componente.
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
        // Valores dummy: la app arranca y el proxy redirige; nunca se inicia OAuth real.
        env: {
            AUTH_SECRET: "e2e-dummy-secret-not-real-do-not-use",
            AUTH_GITHUB_ID: "e2e-dummy-id",
            AUTH_GITHUB_SECRET: "e2e-dummy-secret",
            // NextAuth v5 exige confiar en el host fuera de Vercel (evita UntrustedHost).
            AUTH_TRUST_HOST: "true",
        },
    },
});
