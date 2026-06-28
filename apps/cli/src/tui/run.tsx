import { render } from "ink";
import { App } from "./App";

// Lanza la TUI a pantalla completa (alternate screen buffer), como Claude Code:
// toma toda la terminal y la restaura al salir.
export async function runTui(token?: string): Promise<void> {
    // Entramos en la pantalla alternativa y ocultamos el cursor nativo: sin esto
    // se queda parpadeando al final de la última escritura (la barra de atajos),
    // ya que la TUI no usa ningún campo de texto que lo posicione.
    const enterAltScreen = "\x1b[?1049h\x1b[H\x1b[?25l";
    const leaveAltScreen = "\x1b[?25h\x1b[?1049l";

    process.stdout.write(enterAltScreen);
    // Si el proceso muere por una señal, restauramos cursor + pantalla normal.
    const restore = () => process.stdout.write(leaveAltScreen);
    process.on("exit", restore);

    const { waitUntilExit } = render(<App token={token} />);
    try {
        await waitUntilExit();
    } finally {
        process.off("exit", restore);
        process.stdout.write(leaveAltScreen);
    }
}
