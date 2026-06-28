import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GitHubAIService, type PendingPR } from "@repo/core";
import { SessionBar } from "@/app/components/SessionBar";

// Formatea una fecha ISO como tiempo relativo en español (aprox).
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `hace ${months} mes${months > 1 ? "es" : ""}`;
  return `hace ${Math.floor(months / 12)} a`;
}

// Fila de un PR pendiente: enlaza a su pantalla de análisis.
// Componente a nivel de módulo (regla `rerender-no-inline-components`).
function PRRow({ pr }: { pr: PendingPR }) {
  return (
    <Link
      href={`/pr/${pr.owner}/${pr.repo}/${pr.number}`}
      className="group flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-5 py-4 transition-colors hover:bg-card-hover"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">
            {pr.title}
          </span>
          {pr.draft ? (
            <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted">
              Borrador
            </span>
          ) : null}
        </div>
        <p className="mt-1 truncate text-xs text-muted">
          {pr.full_name} <span className="text-border">·</span> #{pr.number}
          {pr.author ? (
            <>
              {" "}
              <span className="text-border">·</span> {pr.author}
            </>
          ) : null}{" "}
          <span className="text-border">·</span> {timeAgo(pr.created_at)}
        </p>
      </div>
      <span className="shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground">
        →
      </span>
    </Link>
  );
}

// Estado vacío cuando no hay PRs pendientes.
function EmptyState() {
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

export default async function Home() {
  const session = await auth();

  // Red de seguridad (el proxy ya redirige a los no autenticados).
  if (!session?.accessToken) {
    redirect("/login");
  }

  let prs: PendingPR[] = [];
  let error: string | null = null;
  try {
    const service = new GitHubAIService(session.accessToken);
    prs = await service.listPendingPullRequests();
  } catch (e) {
    console.error(e);
    error = "No se pudieron cargar tus Pull Requests. Inténtalo de nuevo.";
  }

  return (
    <>
      <SessionBar name={session.user?.name} image={session.user?.image} />

      <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-12">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">
            Tus Pull Requests pendientes
          </h1>
          <p className="mt-2 text-sm text-muted">
            PRs abiertos en tus repositorios. Haz clic en uno para ver su
            análisis con IA.
          </p>
        </header>

        {error ? (
          <p className="mt-8 rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : prs.length === 0 ? (
          <EmptyState />
        ) : (
          <ul className="mt-8 space-y-2.5">
            {prs.map((pr) => (
              <li key={`${pr.full_name}#${pr.number}`}>
                <PRRow pr={pr} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
