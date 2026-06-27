import type { PRAnalysis } from "@repo/core";

// Tarjeta de resultados del análisis IA (presentacional, sin estado).
export function ResultCard({ result }: { result: PRAnalysis }) {
  const aprobado = result.puntuacion_codigo >= 7;

  return (
    <div className="w-full space-y-5 rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <h2 className="text-base font-semibold tracking-tight">
          Resultado del análisis
        </h2>
        <span
          className={`font-mono text-2xl font-semibold ${
            aprobado ? "text-success" : "text-danger"
          }`}
        >
          {result.puntuacion_codigo}/10
        </span>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        <span className="font-medium text-foreground">Resumen: </span>
        {result.resumen_ejecutivo}
      </p>

      <div
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
          result.apto_para_merge
            ? "border-success/30 bg-success/10 text-success"
            : "border-danger/30 bg-danger/10 text-danger"
        }`}
      >
        {result.apto_para_merge ? "Apto para merge" : "No apto para merge"}
      </div>

      {result.posibles_bugs.length > 0 ? (
        <div className="border-t border-border pt-5">
          <h3 className="mb-2.5 text-sm font-medium text-danger">
            Posibles bugs
          </h3>
          <ul className="space-y-1.5 text-sm text-muted">
            {result.posibles_bugs.map((bug, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-danger" />
                <span>{bug}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
