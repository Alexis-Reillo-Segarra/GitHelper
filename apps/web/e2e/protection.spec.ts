import { test, expect } from "@playwright/test";

test.describe("Protección de rutas", () => {
    test("redirige a /login al entrar sin sesión", async ({ page }) => {
        await page.goto("/");
        await expect(page).toHaveURL(/\/login$/);
        await expect(
            page.getByRole("heading", { name: /GitHub AI Helper/i }),
        ).toBeVisible();
    });

    test("la ruta de detalle de PR también queda protegida", async ({ page }) => {
        await page.goto("/pr/vercel/next.js/123");
        await expect(page).toHaveURL(/\/login$/);
    });
});
