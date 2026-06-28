// Paleta de la TUI — disciplina "OpenCode": casi monocroma sobre negro, con un
// único color de acento (violeta de marca) reservado a lo interactivo. El resto
// son neutros que crean jerarquía solo por luminosidad. Ink acepta hex en las
// props `color`.
export const colors = {
    // Acento de marca: único color saturado. Solo en lo interactivo / la marca.
    accent: "#a78bfa", // violet-400

    // Logotipo bicolor (cara brillante + parte tenue), estilo wordmark.
    logoFace: "#a78bfa", // "helper" — acento de marca
    logoShadow: "#52525b", // "git" — gris neutro

    // Escala de grises para texto. La jerarquía nace de la luminosidad.
    fg: "#ededed", // texto principal
    muted: "#9ca3af", // texto secundario
    dim: "#71717a", // etiquetas / terciario
    faint: "#3f3f46", // bordes, separadores, inactivo

    // Estados (se usan con moderación, nunca como decoración).
    ok: "#4ade80",
    warn: "#fbbf24",
    bad: "#f87171",
    sky: "#60a5fa",
} as const;
