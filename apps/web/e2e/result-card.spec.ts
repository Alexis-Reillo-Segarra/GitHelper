import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// E2E visual del veredicto (`ResultCard`) en navegador real, contra la ruta de
// preview con datos mock (/dev/result-preview). Cubre lo que los tests de
// componente no pueden: render real del gauge SVG, colores de severidad y a11y
// de página completa (contraste incluido).
test.describe("ResultCard · veredicto", () => {
    test.beforeEach(async ({ page }) => {
        await page.goto("/dev/result-preview");
        await expect(
            page.getByRole("heading", { name: "Preview · ResultCard" }),
        ).toBeVisible();
    });

    test("aprobar: nota alta, apto y sin problemas", async ({ page }) => {
        const v = page.getByTestId("variant-aprobar");
        await expect(v.getByRole("img", { name: "Puntuación 9 de 10" })).toBeVisible();
        await expect(v.getByText("Aprobar", { exact: true })).toBeVisible();
        // Capitalizado para distinguir de "No apto para merge".
        await expect(v.getByText(/Apto para merge/)).toBeVisible();
        await expect(v.getByText("Sin problemas detectados")).toBeVisible();
        // El anillo de progreso se renderiza como SVG.
        await expect(v.locator("circle.gauge-progress")).toHaveCount(1);
    });

    test("bloqueado: no apto y problemas agrupados por severidad", async ({
        page,
    }) => {
        const v = page.getByTestId("variant-bloqueado");
        await expect(v.getByRole("img", { name: "Puntuación 2 de 10" })).toBeVisible();
        await expect(v.getByText("Bloqueado", { exact: true })).toBeVisible();
        await expect(v.getByText(/No apto para merge/)).toBeVisible();
        // Cabeceras de grupo (chip con etiqueta + recuento), en orden de gravedad.
        await expect(v.getByText(/^Crítico/)).toBeVisible();
        await expect(v.getByText(/^Mayor/)).toBeVisible();
        await expect(v.getByText(/^Menor/)).toBeVisible();
        // El prefijo `[critico]` se limpia de la descripción.
        await expect(v.getByText(/\[critico\]/)).toHaveCount(0);
    });

    test("cambios mayores: distribución de severidad", async ({ page }) => {
        const v = page.getByTestId("variant-cambios-mayores");
        await expect(v.getByText("Cambios mayores", { exact: true })).toBeVisible();
        await expect(v.getByText(/No apto para merge/)).toBeVisible();
        await expect(v.getByText("2 mayores")).toBeVisible();
        await expect(v.getByText("1 menor")).toBeVisible();
    });

    test("degradación: bug sin prefijo se muestra igual", async ({ page }) => {
        const v = page.getByTestId("variant-sin-clasificar");
        await expect(
            v.getByText("Problema reportado sin etiqueta de severidad."),
        ).toBeVisible();
    });

    test("sin violaciones de accesibilidad (incluye contraste)", async ({
        page,
    }) => {
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa"])
            .analyze();
        expect(results.violations).toEqual([]);
    });

    test("captura visual de cada variante", async ({ page }) => {
        for (const id of [
            "aprobar",
            "cambios-menores",
            "cambios-mayores",
            "bloqueado",
        ]) {
            await page
                .getByTestId(`variant-${id}`)
                .screenshot({ path: `e2e/__screenshots__/result-${id}.png` });
        }
    });
});
