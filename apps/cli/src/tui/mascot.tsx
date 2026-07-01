import { useEffect, useState, type ReactNode } from "react";
import { Box, Text } from "ink";

// ── Mascota: Eelektross «obrero» en pixel-art ────────────────────────────────
// Derivada del GIF de referencia (media/Eelektross_NB.gif): se redujo un frame
// a 30 px de ancho y se cuantizó a una paleta pequeña; encima se le dibujó a
// mano un casco de obra amarillo sobre la cabeza y una llave inglesa. Ver la
// imagen final en media/mascot-eelektross.png y los scripts de generación.
// Se pinta con medios-bloques (▀/▄): cada celda de texto pinta dos píxeles
// verticales (fg = arriba, bg = abajo), así duplicamos la resolución vertical y
// el resultado se ve casi cuadrado. Los píxeles transparentes (índice 0) se
// dejan en blanco para que se vea el fondo real del terminal (sin recuadro).
//
// Paleta indexada: el índice 0 es transparente; cada píxel es un carácter en
// base36 (0-9a-z) que indexa PAL. Índices 1..13 vienen del sprite del Pokémon;
// 14..20 son los colores añadidos del casco (amarillos) y la llave (aceros).
const PAL: (string | null)[] = [
    null, // 0 · transparente
    "#246078", // 1 · cuerpo (azul-verdoso)
    "#0c0c18", // 2 · contorno casi negro
    "#0c3048", // 3 · cuerpo (sombra)
    "#cca878", // 4 · vientre (tostado)
    "#f0e4a8", // 5 · vientre (claro)
    "#e47854", // 6 · boca / ventosas (coral)
    "#fcd800", // 7 · ojos / manchas (amarillo)
    "#002430", // 8 · sombra profunda
    "#847848", // 9 · tostado oscuro
    "#fcfcfc", // 10 · dientes / brillo (blanco)
    "#e4b400", // 11 · amarillo apagado
    "#9c300c", // 12 · boca (rojo oscuro)
    "#848484", // 13 · gris
    "#f4b400", // 14 · casco (amarillo base)
    "#ffd24a", // 15 · casco (brillo)
    "#b06a00", // 16 · casco (sombra)
    "#5a3600", // 17 · casco (borde)
    "#d4dae4", // 18 · llave (acero claro)
    "#9aa3b2", // 19 · llave (acero medio)
    "#4a5361", // 20 · llave (acero oscuro)
];

// Cada fila es una cadena de 30 caracteres base36 (índice en PAL).
// prettier-ignore
const SPRITE: string[] = [
    "00000eeeee00000000000000000000",
    "0000efffffe0000000000000000000",
    "000efffffffe000000000000000000",
    "000eeeeeeeee800000000000300000",
    "000ggggggggg311000000031320000",
    "0000hhhhhhh1111200000030000000",
    "0000011777b1111112008100000000",
    "000011727111711444994500000000",
    "000661711202171825455500000000",
    "00066666cc00111300545500000000",
    "000a6a66a202348100000200000000",
    "000002003320043218000000400000",
    "000000211200044321180049300000",
    "0000011110002iii00111442300000",
    "000011a300005i1i05521723300000",
    "0001162800095iji55541111200000",
    "00036761000551j155831171100000",
    "0002a662000954j1333831b1100000",
    "00000132000044j33352d111100000",
    "00000000000092j42294923a000000",
    "00000000000000k002200022000000",
];

// Alfabeto base36 para decodificar cada carácter a índice de paleta.
const CH = "0123456789abcdefghijklmnopqrstuvwxyz";

const WIDTH = SPRITE[0].length;
const HEIGHT = SPRITE.length;

// Rejilla base como índices de paleta (0 = transparente).
const BASE: number[][] = SPRITE.map((row) => [...row].map((c) => CH.indexOf(c)));

// Amplitud del «flotar» en píxeles (medio carácter cada paso → muy suave).
const BOB = 2;
// Desplazamiento vertical por frame: sube y baja con permanencia en los
// extremos (curva suavizada) para que el flote se lea fluido y no a saltos.
const BOB_SEQ = [0, 0, 0, 0, 0, 1, 1, 1, 2, 2, 2, 2, 2, 1, 1, 1];
// Período de tick que cierra el bucle del flote.
const CYCLE = BOB_SEQ.length;

/** Construye la rejilla del frame aplicando el flote (offset vertical). */
function frameGrid(top: number): number[][] {
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
 * Mascota animada para el menú: el Eelektross obrero que flota suavemente.
 * Altura fija (HEIGHT + BOB píxeles) para que el layout no «salte» entre frames.
 */
export function Mascot() {
    const [top, setTop] = useState(() => BOB_SEQ[0]);
    useEffect(() => {
        // El contador avanza en una variable local: el intervalo solo provoca
        // re-render (reconciliación + reescritura ANSI) cuando el flote cambia.
        let tick = 0;
        const id = setInterval(() => {
            tick = (tick + 1) % CYCLE;
            const next = BOB_SEQ[tick];
            setTop((prev) => (prev === next ? prev : next));
        }, 130);
        return () => clearInterval(id);
    }, []);

    return (
        <Box flexDirection="column" alignItems="center">
            {renderRows(frameGrid(top))}
        </Box>
    );
}

/** Filas de texto que ocupa la mascota (para decidir si cabe en vertical). */
export const MASCOT_ROWS = Math.ceil((HEIGHT + BOB) / 2);
