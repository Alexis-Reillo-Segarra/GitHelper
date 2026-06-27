"use client";

import { signIn } from "next-auth/react";

// Icono de GitHub en SVG inline (extraído a nivel de módulo).
function GitHubMark() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.72-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.49-1.11-1.49-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.7 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 2.5-.34c.85 0 1.71.12 2.5.34 1.91-1.33 2.75-1.05 2.75-1.05.55 1.4.2 2.44.1 2.7.64.72 1.03 1.63 1.03 2.75 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.02 10.02 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      {/* Tarjeta de login centrada y minimalista */}
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8">
        <div className="text-center">
          <h1 className="text-xl font-semibold tracking-tight">
            GitHub AI Helper
          </h1>
          <p className="mt-2.5 text-sm leading-relaxed text-muted">
            Inicia sesión para analizar Pull Requests de GitHub con IA.
          </p>
        </div>

        <button
          type="button"
          onClick={() => signIn("github", { callbackUrl: "/" })}
          className="mt-8 inline-flex w-full items-center justify-center gap-2.5 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90"
        >
          <GitHubMark />
          Continuar con GitHub
        </button>

        <p className="mt-6 text-center text-xs text-muted">
          Solo accedemos a información pública de tu cuenta.
        </p>
      </div>
    </main>
  );
}
