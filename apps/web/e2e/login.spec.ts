import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Página de login", () => {
    test("muestra el encabezado y el botón de GitHub", async ({ page }) => {
        await page.goto("/login");
        await expect(
            page.getByRole("heading", { name: /GitHub AI Helper/i }),
        ).toBeVisible();
        await expect(
            page.getByRole("button", { name: /Continuar con GitHub/i }),
        ).toBeVisible();
    });

    test("no tiene violaciones de accesibilidad (incluye contraste)", async ({
        page,
    }) => {
        await page.goto("/login");
        await page.getByRole("button", { name: /Continuar con GitHub/i }).waitFor();
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();
        expect(results.violations).toEqual([]);
    });
});
