import { useEffect, useState, type ReactNode } from "react";
import { Box, Text } from "ink";

// ── Mascota: pulpo «obrero» en pixel-art ─────────────────────────────────────
// Sprite derivado de la ilustración de marca y reducido a 20×18 «píxeles».
// Se dibuja con medios-bloques (▀/▄): cada celda de texto pinta dos píxeles
// verticales (fg = arriba, bg = abajo), así duplicamos la resolución vertical y
// el resultado se ve casi cuadrado. Los píxeles transparentes (índice 0) se
// dejan en blanco para que se vea el fondo real del terminal (sin recuadro).
//
// La paleta usa un único dígito por píxel; cada fila es una cadena de 20 dígitos.
const PAL: (string | null)[] = [
    null, // 0 · transparente
    "#170e1e", // 1 · contorno (casi negro violáceo)
    "#6c2b8a", // 2 · cuerpo (sombra)
    "#9b3fc0", // 3 · cuerpo (base)
    "#c47fe0", // 4 · cuerpo (luz)
    "#e9e7f2", // 5 · casco (blanco)
    "#b7bacb", // 6 · casco (sombra)
    "#f4f4ff", // 7 · ojo (blanco)
    "#2a36c0", // 8 · ojo (azul)
    "#a6acbe", // 9 · llave inglesa (acero)
];

// prettier-ignore
const SPRITE: string[] = [
    "00000000111110000000",
    "00000001555551090900",
    "00000015555555190900",
    "00000155555665199900",
    "00001155555555559900",
    "00001666666666669320",
    "00001222222222210320",
    "00001233333333210330",
    "01221127833783113211",
    "00011113333332112100",
    "00011012333331012100",
    "00013112333321123100",
    "01211333333333232111",
    "12112212233322321211",
    "11101232221232332101",
    "00001231310131111000",
    "00001221210132100000",
    "00001111110111100000",
];

const WIDTH = SPRITE[0].length;
const HEIGHT = SPRITE.length;

// Rejilla base como números (0 = transparente).
const BASE: number[][] = SPRITE.map((row) => [...row].map((c) => Number(c)));

// Localiza los ojos (pupilas azules = 8) y el halo claro que las rodea, para
// poder «cerrarlos» en el parpadeo sustituyéndolos por el color del cuerpo.
const EYE_CELLS: Array<[number, number]> = [];
for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
        if (BASE[y][x] !== 8) continue;
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const ny = y + dy, nx = x + dx;
                if (ny < 0 || ny >= HEIGHT || nx < 0 || nx >= WIDTH) continue;
                const v = BASE[ny][nx];
                // pupila o brillo del ojo (blancos/luz), nunca el cuerpo oscuro
                if (v === 8 || v === 7 || v === 4) EYE_CELLS.push([nx, ny]);
            }
        }
    }
}

// Amplitud del «flotar» en píxeles (medio carácter cada paso → muy suave).
const BOB = 2;
// Desplazamiento vertical por frame: sube y baja con permanencia en los
// extremos (curva suavizada) para que el flote se lea fluido y no a saltos.
const BOB_SEQ = [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1];
// Período de tick que cierra en bucle tanto el flote (16) como el parpadeo (40).
const CYCLE = 16 * 40;

/** Construye la rejilla del frame: aplica flote (offset) y parpadeo. */
function frameGrid(top: number, blink: boolean): number[][] {
    const grid: number[][] = [];
    const total = HEIGHT + BOB;
    for (let y = 0; y < total; y++) {
        const src = y - top;
        if (src < 0 || src >= HEIGHT) {
            grid.push(new Array(WIDTH).fill(0));
        } else {
            grid.push([...BASE[src]]);
        }
    }
    if (blink) {
        for (const [x, y] of EYE_CELLS) grid[y + top][x] = 3;
    }
    return grid;
}

/** Renderiza la rejilla con medios-bloques, fila de texto = 2 píxeles. */
function renderRows(grid: number[][]): ReactNode[] {
    const rows: ReactNode[] = [];
    for (let y = 0; y < grid.length; y += 2) {
        const topRow = grid[y];
        const botRow = grid[y + 1] ?? new Array(WIDTH).fill(0);
        const cells: ReactNode[] = [];
        for (let x = 0; x < WIDTH; x++) {
            const t = topRow[x], b = botRow[x];
            const tc = PAL[t], bc = PAL[b];
            let node: ReactNode;
            if (!tc && !bc) {
                node = " ";
            } else if (tc && bc) {
                node = (
                    <Text key={x} color={tc} backgroundColor={bc}>
                        ▀
                    </Text>
                );
            } else if (tc) {
                node = (
                    <Text key={x} color={tc}>
                        ▀
                    </Text>
                );
            } else {
                node = (
                    <Text key={x} color={bc!}>
                        ▄
                    </Text>
                );
            }
            cells.push(node);
        }
        rows.push(<Text key={y}>{cells}</Text>);
    }
    return rows;
}

/**
 * Mascota animada para el menú. Flota suavemente y parpadea de vez en cuando.
 * Altura fija (HEIGHT + BOB píxeles) para que el layout no «salte» entre frames.
 */
export function Mascot() {
    // Parpadeo breve cada ~5 s (dos ticks seguidos para que se aprecie).
    const frameAt = (tick: number) => ({
        top: BOB_SEQ[tick % BOB_SEQ.length],
        blink: tick % 40 === 0 || tick % 40 === 1,
    });
    const [frame, setFrame] = useState(() => frameAt(0));
    useEffect(() => {
        // El contador avanza en un ref: el intervalo solo provoca re-render
        // (reconciliación + reescritura ANSI) cuando el fotograma visible cambia.
        let tick = 0;
        const id = setInterval(() => {
            tick = (tick + 1) % CYCLE;
            const next = frameAt(tick);
            setFrame((prev) =>
                prev.top === next.top && prev.blink === next.blink ? prev : next,
            );
        }, 130);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const grid = frameGrid(frame.top, frame.blink);

    return (
        <Box flexDirection="column" alignItems="center">
            {renderRows(grid)}
        </Box>
    );
}

/** Filas de texto que ocupa la mascota (para decidir si cabe en vertical). */
export const MASCOT_ROWS = Math.ceil((HEIGHT + BOB) / 2);
