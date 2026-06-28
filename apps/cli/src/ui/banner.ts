import { c } from "./theme";
import { figletWord } from "./figlet";

const TAGLINE = "code review con IA, en tu terminal";

/** Une dos bloques lado a lado y los colorea por separado (wordmark bicolor). */
function joinColored(
    left: string[],
    right: string[],
    paintLeft: (s: string) => string,
    paintRight: (s: string) => string,
): string[] {
    const h = Math.max(left.length, right.length);
    const lw = Math.max(...left.map((l) => l.length));
    const rw = Math.max(...right.map((l) => l.length));
    const out: string[] = [];
    for (let i = 0; i < h; i++) {
        const l = (left[i] ?? "").padEnd(lw, " ");
        const r = (right[i] ?? "").padEnd(rw, " ");
        out.push(paintLeft(l) + paintRight(r));
    }
    return out;
}

/**
 * Banner del `--help`: wordmark "git·helper" en bloques (git tenue, helper en
 * acento) y un tagline alineado a la izquierda bajo el logo. Estética sobria,
 * sin caja ni adornos, en línea con la TUI.
 */
export function renderBanner(): string {
    const lines = joinColored(
        figletWord("git"),
        figletWord("helper"),
        (s) => c.dim(s),
        (s) => c.light(s),
    );
    return "\n" + lines.join("\n") + "\n\n" + "  " + c.gray(TAGLINE) + "\n";
}
