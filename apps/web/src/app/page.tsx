"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { PRAnalysis } from "@repo/core";

// Definimos cómo será la llamada al servidor
async function fetchAnalysis(
  owner: string,
  repo: string,
  pr: number,
): Promise<PRAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, repo, pr }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al analizar el PR");
  }

  return response.json();
}

// Cabecera discreta con la sesión del usuario.
// Componente a nivel de módulo (regla `rerender-no-inline-components`).
function SessionBar({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3.5">
        <span className="text-sm font-medium tracking-tight text-foreground">
          GitHub AI Helper
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            {/* Avatar: usamos <img> para evitar configurar remotePatterns */}
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt={name ?? "Avatar del usuario"}
                width={28}
                height={28}
                className="rounded-full border border-border"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card text-xs text-muted">
                {name?.charAt(0).toUpperCase() ?? "?"}
              </span>
            )}
            <span className="text-sm text-muted">{name ?? "Usuario"}</span>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card-hover hover:text-foreground"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}

// Placeholder sobrio mientras se resuelve la sesión.
function LoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <p className="text-sm text-muted">Cargando…</p>
      </div>
    </main>
  );
}

// Estado vacío para usuarios no autenticados.
function SignedOutState() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          GitHub AI Helper
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Analiza Pull Requests de GitHub al instante con IA. Inicia sesión para
          revisar tu primer PR.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center justify-center rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          Iniciar sesión con GitHub
        </Link>
      </div>
    </main>
  );
}

// Tarjeta de resultados re-estilizada.
function ResultCard({ result }: { result: PRAnalysis }) {
  const aprobado = result.puntuacion_codigo >= 7;

  return (
    <div className="mt-8 w-full max-w-2xl space-y-5 rounded-xl border border-border bg-card p-6">
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

export default function Home() {
  const { data: session, status } = useSession();

  const [owner, setOwner] = useState("vercel");
  const [repo, setRepo] = useState("next.js");
  const [prNumber, setPrNumber] = useState("65000");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PRAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const pr = parseInt(prNumber, 10);
    if (Number.isNaN(pr)) {
      setError("Introduce un número de PR válido");
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchAnalysis(owner, repo, pr);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Placeholder sobrio mientras carga la sesión.
  if (status === "loading") {
    return <LoadingState />;
  }

  // Estado vacío elegante si no hay sesión.
  if (status === "unauthenticated") {
    return <SignedOutState />;
  }

  const inputClass =
    "rounded-md border border-border bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted transition-colors focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <>
      <SessionBar name={session?.user?.name} image={session?.user?.image} />

      <main className="mx-auto flex w-full max-w-3xl flex-col items-center px-6 pb-24 pt-16">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight">
            Analiza tus Pull Requests
          </h1>
          <p className="mt-3 text-sm text-muted">
            Revisión de código con IA al instante.
          </p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="mt-10 flex w-full max-w-2xl flex-wrap items-center justify-center gap-3 rounded-xl border border-border bg-card p-4"
        >
          <input
            type="text"
            placeholder="Owner (ej: vercel)"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            className={`${inputClass} min-w-[10rem] flex-1`}
            required
          />
          <input
            type="text"
            placeholder="Repo (ej: next.js)"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            className={`${inputClass} min-w-[10rem] flex-1`}
            required
          />
          <input
            type="number"
            placeholder="PR #"
            value={prNumber}
            onChange={(e) => setPrNumber(e.target.value)}
            className={`${inputClass} w-24`}
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="rounded-md bg-accent px-5 py-2 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isLoading ? "Analizando…" : "Analizar PR"}
          </button>
        </form>

        {/* Errores */}
        {error ? (
          <p className="mt-6 w-full max-w-2xl rounded-md border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {/* Resultados */}
        {result ? <ResultCard result={result} /> : null}
      </main>
    </>
  );
}
