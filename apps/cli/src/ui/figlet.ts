// Arte ANSI Shadow pre-renderizado de "git" y "helper".
//
// Antes esto se generaba en tiempo de ejecución con la librería figlet, que
// arrastra ~18,7 MB de fuentes (cientos de FIGfonts) solo para renderizar
// estas dos cadenas FIJAS con UNA fuente. Al inlinear el resultado eliminamos
// la dependencia por completo y su coste de render en cada arranque del CLI.
//
// Para regenerarlo (si cambia el wordmark): instalar figlet y ejecutar
// figlet.textSync(word, { font: "ANSI Shadow" }), recortando el espacio en
// blanco final de cada línea y descartando las líneas vacías.
const ART: Record<string, readonly string[]> = {
    git: [
        " ██████╗ ██╗████████╗",
        "██╔════╝ ██║╚══██╔══╝",
        "██║  ███╗██║   ██║",
        "██║   ██║██║   ██║",
        "╚██████╔╝██║   ██║",
        " ╚═════╝ ╚═╝   ╚═╝",
    ],
    helper: [
        "██╗  ██╗███████╗██╗     ██████╗ ███████╗██████╗",
        "██║  ██║██╔════╝██║     ██╔══██╗██╔════╝██╔══██╗",
        "███████║█████╗  ██║     ██████╔╝█████╗  ██████╔╝",
        "██╔══██║██╔══╝  ██║     ██╔═══╝ ██╔══╝  ██╔══██╗",
        "██║  ██║███████╗███████╗██║     ███████╗██║  ██║",
        "╚═╝  ╚═╝╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝",
    ],
};

/**
 * Devuelve el wordmark en bloques (fuente "ANSI Shadow") como filas de texto.
 * Solo conoce las palabras del logotipo ("git", "helper").
 */
export function figletWord(word: string): string[] {
    const art = ART[word];
    if (!art) {
        throw new Error(`figletWord: sin arte pre-renderizado para "${word}"`);
    }
    return [...art];
}
