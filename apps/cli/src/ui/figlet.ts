import figlet from "figlet";

/** Renderiza una palabra como bloques (fuente "ANSI Shadow"), sin filas vacías. */
export function figletWord(word: string): string[] {
    return figlet
        .textSync(word, { font: "ANSI Shadow" })
        .replace(/\s+$/gm, "")
        .split("\n")
        .filter((l) => l.length > 0);
}
