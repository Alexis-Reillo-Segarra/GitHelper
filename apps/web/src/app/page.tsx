import { redirect } from "next/navigation";
import { GitHubAIService, type GitHubUser, type PendingPR } from "@repo/core";
import { readConfig } from "@/lib/config";
import { SessionBar } from "@/app/components/SessionBar";
import { PRRow } from "@/app/components/PRRow";
import { EmptyState } from "@/app/components/EmptyState";

export default async function Home() {
  const config = await readConfig();

  // Red de seguridad (el proxy ya redirige a quien no esté configurado).
  if (!config) {
    redirect("/login");
  }

  const service = new GitHubAIService(config.githubToken);

  let user: GitHubUser | null = null;
  let prs: PendingPR[] = [];
  let error: string | null = null;
  try {
    [user, prs] = await Promise.all([
      service.getAuthenticatedUser(),
      service.listPendingPullRequests(),
    ]);
  } catch (e) {
    console.error(e);
    error = "No se pudieron cargar tus Pull Requests. Revisa tu token de GitHub.";
  }

  return (
    <>
      <SessionBar
        name={user?.name ?? user?.login}
        image={user?.avatar_url}
        provider={config.provider}
        model={config.model}
      />

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
