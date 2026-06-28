import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import type { PRAnalysis } from "@repo/core";
import { readConfig, type WebConfig } from "@/lib/config";
import { createAnalysisService } from "@/lib/service";
import { SessionBar } from "@/app/components/SessionBar";
import { ResultCard } from "@/app/components/ResultCard";

// En Next 16 los `params` de una ruta dinámica son una Promise.
type PageParams = Promise<{ owner: string; repo: string; number: string }>;

// Estado de carga mientras la IA analiza el PR (se transmite vía Suspense).
function AnalyzingState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card px-6 py-16 text-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
      <p className="text-sm font-medium text-foreground">Analizando el PR…</p>
      <p className="text-sm text-muted">
        Descargando el diff y revisándolo con IA. Puede tardar unos segundos.
      </p>
    </div>
  );
}

// Caja de error reutilizable.
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger/10 px-6 py-8 text-center">
      <p className="text-sm font-medium text-danger">No se pudo analizar el PR</p>
      <p className="mt-1.5 text-sm text-muted">{message}</p>
    </div>
  );
}

// Componente servidor asíncrono: ejecuta el análisis y renderiza el resultado.
// Al ser async y estar bajo <Suspense>, Next transmite el fallback mientras resuelve.
async function Analysis({
  owner,
  repo,
  number,
  config,
}: {
  owner: string;
  repo: string;
  number: number;
  config: WebConfig;
}) {
  // El try/catch envuelve solo la llamada que puede fallar (el await), no la
  // construcción del JSX: React no renderiza el componente aquí, así que un
  // error de render no lo capturaría este catch (regla react-hooks/error-boundaries).
  let result: PRAnalysis;
  try {
    const service = createAnalysisService(config);

    // El SHA de cabecera identifica el contenido del PR: mientras no cambie, el
    // análisis cacheado sigue siendo válido y nos ahorramos las llamadas a la
    // IA (lo caro). La clave NO incluye credenciales, pero sí el proveedor y el
    // modelo: dos modelos distintos pueden dar análisis distintos del mismo SHA.
    const sha = await service.getPullHeadSha(owner, repo, number);
    const modelKey = config.model ?? "default";
    const getCachedAnalysis = unstable_cache(
      () => service.analyzePR(owner, repo, number),
      ["pr-analysis", owner, repo, String(number), sha, config.provider, modelKey],
      { revalidate: 86400, tags: [`pr-analysis:${owner}/${repo}#${number}`] },
    );
    result = await getCachedAnalysis();
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Error inesperado al analizar el PR.";
    return <ErrorBox message={message} />;
  }
  return <ResultCard result={result} />;
}

export default async function PRDetailPage({
  params,
}: {
  params: PageParams;
}) {
  const config = await readConfig();

  // Red de seguridad (el proxy ya protege la ruta).
  if (!config) {
    redirect("/login");
  }

  const { owner, repo, number } = await params;
  const prNumber = Number.parseInt(number, 10);

  return (
    <>
      <SessionBar provider={config.provider} model={config.model} />

      <main className="mx-auto w-full max-w-2xl px-6 pb-24 pt-12">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-foreground"
        >
          ← Volver a tus PRs
        </Link>

        <header className="mt-6 mb-8">
          <h1 className="text-xl font-semibold tracking-tight">
            {owner}/{repo}{" "}
            <span className="font-mono text-muted">#{number}</span>
          </h1>
        </header>

        {Number.isNaN(prNumber) ? (
          <ErrorBox message="El número de PR no es válido." />
        ) : (
          <Suspense fallback={<AnalyzingState />}>
            <Analysis
              owner={owner}
              repo={repo}
              number={prNumber}
              config={config}
            />
          </Suspense>
        )}
      </main>
    </>
  );
}
