// Matchers de Testing Library (toBeInTheDocument, etc.) integrados con Vitest.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Desmonta el árbol React tras cada test para aislarlos entre sí.
afterEach(() => {
    cleanup();
});
