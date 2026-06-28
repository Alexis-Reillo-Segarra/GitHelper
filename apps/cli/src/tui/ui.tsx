import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Box, Text, useStdout } from "ink";
import figlet from "figlet";
import { getProvider } from "@repo/core";
import { colors } from "./theme";

// ── Tamaño de terminal reactivo ──────────────────────────────────────────────
// Devuelve columnas/filas y se re-renderiza cuando el usuario cambia el tamaño
// de la pestaña (evento `resize`), para que el layout siempre se adapte.
export function useTerminalSize(): { columns: number; rows: number } {
    const { stdout } = useStdout();
    const [size, setSize] = useState(() => ({
        columns: stdout?.columns ?? 80,
        rows: stdout?.rows ?? 24,
    }));
    useEffect(() => {
        if (!stdout) return;
        // El estado inicial ya leyó el tamaño actual, así que aquí solo
        // reaccionamos a cambios reales y evitamos re-render si no varía nada.
        const onResize = () =>
            setSize((prev) =>
                prev.columns === stdout.columns && prev.rows === stdout.rows
                    ? prev
                    : { columns: stdout.columns, rows: stdout.rows },
            );
        stdout.on("resize", onResize);
        return () => {
            stdout.off("resize", onResize);
        };
    }, [stdout]);
    return size;
}

// Ancho que ocupa el logotipo grande en bloques (git + helper, fuente ANSI
// Shadow). Por debajo de esto conviene caer al wordmark compacto.
export const LOGO_WIDTH = 68;

// ── Logotipo ───────────────────────────────────────────────────────────────
// Wordmark a base de bloques (fuente "ANSI Shadow"), partido en dos palabras
// con distinto color: "git" en gris neutro y "helper" en el acento de marca,
// al estilo del logo bicolor de OpenCode.
function figletWord(word: string): string[] {
    return figlet
        .textSync(word, { font: "ANSI Shadow" })
        .replace(/\s+$/gm, "")
        .split("\n")
        .filter((l) => l.length > 0);
}

function padTo(lines: string[], width: number): string[] {
    return lines.map((l) => l.padEnd(width, " "));
}

/** Logotipo grande centrado: «git» (tenue) + «helper» (acento). */
export function Logo() {
    const { git, helper } = useMemo(() => {
        const g = figletWord("git");
        const h = figletWord("helper");
        const gw = Math.max(...g.map((l) => l.length));
        const hw = Math.max(...h.map((l) => l.length));
        return { git: padTo(g, gw), helper: padTo(h, hw) };
    }, []);

    return (
        <Box flexDirection="column" alignItems="center">
            <Box>
                <Box flexDirection="column">
                    {git.map((line, i) => (
                        <Text key={i} color={colors.logoShadow}>
                            {line}
                        </Text>
                    ))}
                </Box>
                <Box flexDirection="column">
                    {helper.map((line, i) => (
                        <Text key={i} color={colors.logoFace} bold>
                            {line}
                        </Text>
                    ))}
                </Box>
            </Box>
            <Box marginTop={1}>
                <Text color={colors.dim}>{"code review con IA, en tu terminal"}</Text>
            </Box>
        </Box>
    );
}

/** Marca compacta para vistas con poco espacio vertical (setup, análisis). */
export function Wordmark({ tagline = true }: { tagline?: boolean }) {
    return (
        <Box>
            <Text color={colors.logoShadow} bold>
                git
            </Text>
            <Text color={colors.logoFace} bold>
                helper
            </Text>
            {tagline ? (
                <Text color={colors.dim}>{"   ·   code review con IA"}</Text>
            ) : null}
        </Box>
    );
}

// ── Panel ────────────────────────────────────────────────────────────────────
/** Caja contenedora con borde sutil; el envoltorio visual principal. */
export function Panel({
    children,
    title,
}: {
    children: ReactNode;
    title?: string;
}) {
    return (
        <Box flexDirection="column" width="100%">
            {title ? (
                <Box paddingX={1} marginBottom={0}>
                    <Text color={colors.dim}>{title}</Text>
                </Box>
            ) : null}
            <Box
                borderStyle="round"
                borderColor={colors.faint}
                paddingX={2}
                paddingY={1}
                flexDirection="column"
                width="100%"
            >
                {children}
            </Box>
        </Box>
    );
}

// ── Línea de estado (modo · modelo · proveedor) ──────────────────────────────
/** Resume el contexto activo, como la barra de OpenCode (Build · modelo · zen). */
export function StatusLine({ mode }: { mode: string }) {
    const providerId = process.env.AI_PROVIDER ?? "";
    const provider = providerId ? getProvider(providerId) : undefined;
    const modelId = process.env.AI_MODEL ?? provider?.defaultModel ?? "";
    const modelLabel =
        provider?.models.find((m) => m.id === modelId)?.label.split(" · ")[0] ?? modelId;
    const providerName = provider?.label.split(" · ")[0] ?? "sin proveedor";

    return (
        <Box gap={2}>
            <Text color={colors.accent} bold>
                {mode}
            </Text>
            {modelLabel ? <Text color={colors.fg}>{modelLabel}</Text> : null}
            <Text color={colors.dim}>{providerName}</Text>
        </Box>
    );
}

// ── Barra de atajos ──────────────────────────────────────────────────────────
/** Atajos alineados a la derecha: tecla en acento + descripción tenue. */
export function HintBar({ keys }: { keys: [string, string][] }) {
    return (
        <Box gap={2} justifyContent="flex-end" flexWrap="wrap">
            {keys.map(([k, label]) => (
                <Box key={k}>
                    <Text color={colors.accent} bold>
                        {k}
                    </Text>
                    <Text color={colors.dim}>{` ${label}`}</Text>
                </Box>
            ))}
        </Box>
    );
}
