import chalk from "chalk";

// Paleta: morado sobre negro, minimalista.
export const PURPLE = "#8b5cf6"; // violet-500
export const PURPLE_DARK = "#6d28d9"; // violet-700
export const PURPLE_LIGHT = "#a78bfa"; // violet-400

/** Helpers de color reutilizables en toda la CLI. */
export const c = {
    purple: chalk.hex(PURPLE),
    purpleBold: chalk.hex(PURPLE).bold,
    light: chalk.hex(PURPLE_LIGHT),
    dim: chalk.hex("#6b7280"), // gray-500
    gray: chalk.hex("#9ca3af"), // gray-400
    white: chalk.whiteBright,
    bold: chalk.bold,
    ok: chalk.hex("#22c55e"), // green-500
    bad: chalk.hex("#ef4444"), // red-500
    warn: chalk.hex("#f59e0b"), // amber-500
};
