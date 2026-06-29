// Anillo radial con la puntuación (1–10) en el centro. Presentacional y sin
// estado: el color lo decide quien lo usa (según la recomendación). El barrido
// de entrada es CSS puro (ver `gauge-sweep` en globals.css), así que funciona
// en un Server Component sin JS de cliente.

const R = 52; // radio del anillo
const CIRC = 2 * Math.PI * R;

export function ScoreGauge({
    score,
    colorClass,
}: {
    score: number;
    colorClass: string; // p. ej. "text-success" (pinta `currentColor` del trazo)
}) {
    const pct = Math.max(0, Math.min(1, score / 10));
    const offset = CIRC * (1 - pct);

    return (
        <div
            className="relative h-28 w-28 shrink-0"
            role="img"
            aria-label={`Puntuación ${score} de 10`}
        >
            <svg viewBox="0 0 120 120" className="h-28 w-28 -rotate-90">
                <circle
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="8"
                />
                <circle
                    cx="60"
                    cy="60"
                    r={R}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    strokeLinecap="round"
                    className={`gauge-progress ${colorClass}`}
                    style={{
                        strokeDasharray: CIRC,
                        strokeDashoffset: offset,
                        // Variable que usa el keyframe para arrancar desde "vacío".
                        ["--gauge-circ" as string]: `${CIRC}`,
                        animation: "gauge-sweep 1s ease-out",
                    }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                    className={`text-4xl font-semibold tabular-nums leading-none ${colorClass}`}
                >
                    {score}
                </span>
                <span className="mt-1 text-xs text-muted">/ 10</span>
            </div>
        </div>
    );
}
