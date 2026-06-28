import type { PRAnalysis, Recomendacion } from "@repo/core";

// Presentación de cada recomendación categórica (escala corta, estilo Vercel).
const RECOMENDACION_UI: Record<
  Recomendacion,
  { label: string; badge: string; score: string }
> = {
  aprobar: {
    label: "Aprobar",
    badge: "border-success/30 bg-success/10 text-success",
    score: "text-success",
  },
  cambios_menores: {
    label: "Cambios menores",
    badge: "border-sky-400/30 bg-sky-400/10 text-sky-400",
    score: "text-sky-400",
  },
  cambios_mayores: {
    label: "Cambios mayores",
    badge: "border-amber-400/30 bg-amber-400/10 text-amber-400",
    score: "text-amber-400",
  },
  bloqueado: {
    label: "Bloqueado",
    badge: "border-danger/30 bg-danger/10 text-danger",
    score: "text-danger",
  },
};

// Tarjeta de resultados del análisis IA (presentacional, sin estado).
export function ResultCard({ result }: { result: PRAnalysis }) {
  const ui = RECOMENDACION_UI[result.recomendacion];

  return (
    <div className="w-full space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-base font-semibold tracking-tight">
          Resultado del análisis
        </h2>
        <span className={`font-mono text-2xl font-semibold ${ui.score}`}>
          {result.puntuacion_codigo}/10
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        <span className="font-medium text-foreground">Resumen: </span>
        {result.resumen_ejecutivo}
      </p>

      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${ui.badge}`}
      >
        {ui.label}
      </div>

      {result.posibles_bugs.length > 0 ? (
        <div className="border-t border-border pt-5">
          <h3 className="mb-2.5 text-sm font-medium text-foreground">
            Problemas detectados
          </h3>
          <ul className="space-y-1.5 text-sm text-muted">
            {result.posibles_bugs.map((bug, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted" />
                <span>{bug}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
