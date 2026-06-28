import { axe } from "vitest-axe";

// Accesibilidad a nivel de COMPONENTE (jsdom): comprueba estructura, roles,
// nombres accesibles, etc. La regla `color-contrast` se desactiva porque jsdom
// no tiene layout/canvas para medir color; el contraste se valida en e2e
// (Playwright, navegador real). Así no se duplica la misma comprobación.
export function checkA11y(element: Element) {
    return axe(element, {
        rules: { "color-contrast": { enabled: false } },
    });
}
