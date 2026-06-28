// Estado vacío cuando no hay PRs pendientes. Presentacional.
export function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center rounded-xl border border-dashed border-border bg-card/50 px-6 py-16 text-center">
      <p className="text-sm font-medium text-foreground">
        No tienes Pull Requests pendientes
      </p>
      <p className="mt-1.5 text-sm text-muted">
        Cuando lleguen PRs abiertos a tus repositorios, aparecerán aquí.
      </p>
    </div>
  );
}
