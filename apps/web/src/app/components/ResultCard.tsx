import type { PRAnalysis, Recomendacion } from "@repo/core";
import {
    agruparPorSeveridad,
    contarSeveridades,
    parseBug,
    type Severidad,
} from "@/lib/severity";
import { ScoreGauge } from "./ScoreGauge";

// Presentación de cada recomendación categórica (escala corta, estilo Vercel).
const RECOMENDACION_UI: Record<
    Recomendacion,
    { label: string; badge: string; color: string }
> = {
    aprobar: {
        label: "Aprobar",
        badge: "border-success/30 bg-success/10 text-success",
        color: "text-success",
    },
    cambios_menores: {
        label: "Cambios menores",
        badge: "border-sev-menor/30 bg-sev-menor/10 text-sev-menor",
        color: "text-sev-menor",
    },
    cambios_mayores: {
        label: "Cambios mayores",
        badge: "border-sev-mayor/30 bg-sev-mayor/10 text-sev-mayor",
        color: "text-sev-mayor",
    },
    bloqueado: {
        label: "Bloqueado",
        badge: "border-danger/30 bg-danger/10 text-danger",
        color: "text-danger",
    },
};

// Metadatos visuales por severidad. Clases literales para que Tailwind las
// genere (no construir nombres de clase dinámicamente).
const SEVERIDAD_UI: Record<
    Severidad,
    {
        label: string;
        sing: string; // "1 crítico"
        plur: string; // "2 críticos"
        dot: string;
        border: string;
        chip: string;
    }
> = {
    critico: {
        label: "Crítico",
        sing: "crítico",
        plur: "críticos",
        dot: "bg-sev-critico",
        border: "border-l-sev-critico",
        chip: "border-sev-critico/30 bg-sev-critico/10 text-sev-critico",
    },
    mayor: {
        label: "Mayor",
        sing: "mayor",
        plur: "mayores",
        dot: "bg-sev-mayor",
        border: "border-l-sev-mayor",
        chip: "border-sev-mayor/30 bg-sev-mayor/10 text-sev-mayor",
    },
    menor: {
        label: "Menor",
        sing: "menor",
        plur: "menores",
        dot: "bg-sev-menor",
        border: "border-l-sev-menor",
        chip: "border-sev-menor/30 bg-sev-menor/10 text-sev-menor",
    },
};

// Tarjeta de resultados del análisis IA (presentacional, sin estado).
export function ResultCard({ result }: { result: PRAnalysis }) {
    const ui = RECOMENDACION_UI[result.recomendacion];
    const bugs = result.posibles_bugs.map(parseBug);
    const counts = contarSeveridades(bugs);
    const grupos = agruparPorSeveridad(bugs);

    // Recuentos no nulos para la línea de distribución.
    const distribucion = (["critico", "mayor", "menor"] as const)
        .filter((s) => counts[s] > 0)
        .map((s) => ({ sev: s, n: counts[s] }));

    return (
        <div className="fade-in-up w-full overflow-hidden rounded-2xl border border-border bg-card [animation:fade-in-up_.4s_ease-out]">
            {/* ── Veredicto (hero) ── */}
            <div className="flex flex-col items-center gap-5 border-b border-border px-6 py-7 text-center sm:flex-row sm:items-center sm:gap-7 sm:text-left">
                <ScoreGauge score={result.puntuacion_codigo} colorClass={ui.color} />

                <div className="flex min-w-0 flex-1 flex-col items-center gap-3 sm:items-start">
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${ui.badge}`}
                    >
                        {ui.label}
                    </span>

                    {/* Aptitud para merge: lo que el revisor busca de un vistazo. */}
                    <span
                        className={`inline-flex items-center gap-2 text-sm font-medium ${
                            result.apto_para_merge ? "text-success" : "text-danger"
                        }`}
                    >
                        <span aria-hidden="true">
                            {result.apto_para_merge ? "✓" : "✕"}
                        </span>
                        {result.apto_para_merge
                            ? "Apto para merge"
                            : "No apto para merge"}
                    </span>

                    {/* Distribución de severidad: el "por qué" de la nota. */}
                    {distribucion.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 sm:justify-start">
                            {distribucion.map(({ sev, n }) => (
                                <span
                                    key={sev}
                                    className="inline-flex items-center gap-1.5 text-xs text-muted"
                                >
                                    <span
                                        className={`h-1.5 w-1.5 rounded-full ${SEVERIDAD_UI[sev].dot}`}
                                    />
                                    {n}{" "}
                                    {n === 1
                                        ? SEVERIDAD_UI[sev].sing
                                        : SEVERIDAD_UI[sev].plur}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <span className="text-xs text-muted">Sin problemas detectados</span>
                    )}
                </div>
            </div>

            {/* ── Resumen ── */}
            <div className="px-6 py-5">
                <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">
                    Resumen
                </h3>
                <p className="text-sm leading-relaxed text-foreground/90">
                    {result.resumen_ejecutivo}
                </p>
            </div>

            {/* ── Problemas agrupados por severidad ── */}
            {bugs.length > 0 ? (
                <div className="border-t border-border px-6 py-5">
                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                        Problemas detectados
                    </h3>
                    <div className="space-y-4">
                        {grupos.map((grupo) => {
                            const meta = grupo.severidad
                                ? SEVERIDAD_UI[grupo.severidad]
                                : null;
                            return (
                                <div key={grupo.severidad ?? "otros"}>
                                    {meta ? (
                                        <span
                                            className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${meta.chip}`}
                                        >
                                            {meta.label}
                                            <span className="opacity-70">
                                                {grupo.bugs.length}
                                            </span>
                                        </span>
                                    ) : null}
                                    <ul className="space-y-1.5">
                                        {grupo.bugs.map((bug, i) => (
                                            <li
                                                key={i}
                                                className={`rounded-r-md border-l-2 bg-background/40 py-1.5 pl-3 pr-2 text-sm text-foreground/90 ${
                                                    meta?.border ?? "border-l-border"
                                                }`}
                                            >
                                                {bug.descripcion}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
