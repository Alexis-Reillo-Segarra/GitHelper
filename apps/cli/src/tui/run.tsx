import { render } from "ink";
import { App } from "./App";

// Lanza la TUI a pantalla completa (alternate screen buffer), como Claude Code:
// toma toda la terminal y la restaura al salir.
export async function runTui(token?: string): Promise<void> {
    const enterAltScreen = "\x1b[?1049h\x1b[H";
    const leaveAltScreen = "\x1b[?1049l";

    process.stdout.write(enterAltScreen);
    const { waitUntilExit } = render(<App token={token} />);
    try {
        await waitUntilExit();
    } finally {
        process.stdout.write(leaveAltScreen);
    }
}
