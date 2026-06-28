import figlet from "figlet";
import { c, purpleGradient } from "./theme";

// Mascota: pulpo con casco de obra. Solo chars ancho-1 para que el cálculo
// de ancho de la caja sea exacto (sin glifos de doble ancho que descuadren).
const OCTOPUS: string[] = [
    "    _____    ",
    "   /#####\\   ",
    "  |_______|  ",  // ala del casco
    "  | o   o |  ",
    "   \\  v  /   ",
    "   /|/^\\|\\   ",
    "   ' ' ' '   ",
];

const TAGLINE = "Code review con IA, en tu terminal";

/** Une dos bloques de texto lado a lado, centrados verticalmente. */
function joinSideBySide(left: string[], right: string[], gap = 3): string[] {
    const height = Math.max(left.length, right.length);
    const padBlock = (lines: string[], width: number): string[] => {
        const top = Math.floor((height - lines.length) / 2);
        const out: string[] = [];
        for (let i = 0; i < height; i++) {
            const line = lines[i - top] ?? "";
            out.push(line.padEnd(width, " "));
        }
        return out;
    };
    const lw = Math.max(...left.map((l) => l.length));
    const rw = Math.max(...right.map((l) => l.length));
    const L = padBlock(left, lw);
    const R = padBlock(right, rw);
    return L.map((l, i) => l + " ".repeat(gap) + R[i]);
}

/** Envuelve líneas de texto plano en una caja de bordes redondeados. */
function boxify(lines: string[]): string[] {
    const width = Math.max(...lines.map((l) => l.length));
    const pad = 2;
    const inner = width + pad * 2;
    const top = "╭" + "─".repeat(inner) + "╮";
    const bottom = "╰" + "─".repeat(inner) + "╯";
    const body = lines.map(
        (l) => "│" + " ".repeat(pad) + l.padEnd(width, " ") + " ".repeat(pad) + "│"
    );
    return [top, ...body, bottom];
}

/** Banner completo: pulpo + título figlet + tagline, en caja morada sobre negro. */
export function renderBanner(): string {
    const title = figlet
        .textSync("Git-Helper", { font: "Standard" })
        .replace(/\s+$/gm, "")
        .split("\n")
        .filter((l) => l.length > 0);

    const composed = joinSideBySide(OCTOPUS, title, 3);

    // Línea de tagline centrada bajo el conjunto.
    const blockWidth = Math.max(...composed.map((l) => l.length));
    const tagPad = Math.max(0, Math.floor((blockWidth - TAGLINE.length) / 2));
    const tagLine = " ".repeat(tagPad) + TAGLINE;

    const boxed = boxify([...composed, "", tagLine]);
    return "\n" + purpleGradient(boxed.join("\n")) + "\n";
}
