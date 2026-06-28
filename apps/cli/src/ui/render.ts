import Table from "cli-table3";
import type { PendingPR, PRAnalysis, Recomendacion } from "@repo/core";
import { c } from "./theme";
import { relativeTime } from "./time";

// eslint-disable-next-line no-control-regex
const ANSI = /\[[0-9;]*m/g;
const visibleLen = (s: string): string["length"] => s.replace(ANSI, "").length;
const padVisible = (s: string, w: number): string => s + " ".repeat(Math.max(0, w - visibleLen(s)));

const truncate = (s: string, max: number): string =>
    s.length <= max ? s : s.slice(0, max - 1) + "…";

/** Parte un texto en líneas de como máximo `width` columnas, respetando palabras. */
export function wrap(text: string, width: number): string[] {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
        if (cur && cur.length + 1 + w.length > width) {
            lines.push(cur);
            cur = w;
        } else {
            cur = cur ? `${cur} ${w}` : w;
        }
    }
    if (cur) lines.push(cur);
    return lines;
}

/** Caja de bordes redondeados con título opcional embebido en el borde superior. */
export function box(lines: string[], title?: string): string {
    const inner = Math.max(
        title ? visibleLen(title) + 4 : 0,
        ...lines.map(visibleLen)
    );
    const pad = 1;
    const total = inner + pad * 2;
    let top: string;
    if (title) {
        const label = ` ${title} `;
        const rest = total - visibleLen(label) - 1;
        top = c.dim("╭─") + c.purpleBold(label) + c.dim("─".repeat(Math.max(0, rest)) + "╮");
    } else {
        top = c.dim("╭" + "─".repeat(total) + "╮");
    }
    const bottom = c.dim("╰" + "─".repeat(total) + "╯");
    const body = lines.map(
        (l) => c.dim("│") + " ".repeat(pad) + padVisible(l, inner) + " ".repeat(pad) + c.dim("│")
    );
    return [top, ...body, bottom].join("\n");
}

const RECO_STYLE: Record<Recomendacion, (s: string) => string> = {
    aprobar: (s) => c.ok(`● ${s}`),
    cambios_menores: (s) => c.warn(`● ${s}`),
    cambios_mayores: (s) => c.warn(`● ${s}`),
    bloqueado: (s) => c.bad(`● ${s}`),
};

const recoLabel: Record<Recomendacion, string> = {
    aprobar: "Aprobar",
    cambios_menores: "Cambios menores",
    cambios_mayores: "Cambios mayores",
    bloqueado: "Bloqueado",
};

/** Barra de puntuación tipo ██████░░░░ 6/10. */
function scoreBar(score: number): string {
    const filled = Math.max(0, Math.min(10, Math.round(score)));
    const color = score >= 8 ? c.ok : score >= 5 ? c.warn : c.bad;
    return (
        color("█".repeat(filled)) +
        c.dim("░".repeat(10 - filled)) +
        "  " +
        c.bold(color(`${score}/10`))
    );
}

/** Tarjeta de resultado del análisis de un PR. */
export function analysisCard(ref: string, a: PRAnalysis): string {
    const lines: string[] = [];
    lines.push(c.dim("Puntuación  ") + scoreBar(a.puntuacion_codigo));
    lines.push(c.dim("Veredicto   ") + RECO_STYLE[a.recomendacion](recoLabel[a.recomendacion]));
    lines.push(
        c.dim("Merge       ") + (a.apto_para_merge ? c.ok("✓ apto") : c.bad("✗ no apto"))
    );
    lines.push("");
    wrap(a.resumen_ejecutivo, 66).forEach((l) => lines.push(c.gray(l)));
    if (a.posibles_bugs.length > 0) {
        lines.push("");
        lines.push(c.warn("Posibles bugs:"));
        a.posibles_bugs.forEach((b) => {
            const parts = wrap(b, 62);
            parts.forEach((l, i) =>
                lines.push((i === 0 ? c.dim(" • ") : "   ") + c.white(l))
            );
        });
    } else {
        lines.push("");
        lines.push(c.ok("✓ Sin bugs evidentes."));
    }
    return box(lines, ref);
}

/** Tabla de PRs pendientes. */
export function pendingTable(prs: PendingPR[]): string {
    const table = new Table({
        head: ["", "Repo", "PR", "Título", "Autor", "Abierto"].map((h) =>
            c.purpleBold(h)
        ),
        style: { head: [], border: [], "padding-left": 1, "padding-right": 1 },
        chars: {
            top: "─", "top-mid": "┬", "top-left": "╭", "top-right": "╮",
            bottom: "─", "bottom-mid": "┴", "bottom-left": "╰", "bottom-right": "╯",
            left: "│", "left-mid": "├", mid: "─", "mid-mid": "┼",
            right: "│", "right-mid": "┤", middle: "│",
        },
    });
    prs.forEach((pr, i) => {
        table.push([
            c.dim(String(i + 1)),
            c.white(pr.full_name),
            c.light(`#${pr.number}`) + (pr.draft ? c.dim(" ⌑") : ""),
            truncate(pr.title, 48),
            c.gray(pr.author ?? "—"),
            c.dim(relativeTime(pr.created_at)),
        ]);
    });
    // Pintamos los bordes de la tabla en morado tenue.
    return table
        .toString()
        .split("\n")
        .map((l) => l.replace(/[╭╮╰╯─┬┴├┤┼│]/g, (ch) => c.dim(ch)))
        .join("\n");
}
