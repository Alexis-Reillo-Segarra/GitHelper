"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

// Cabecera discreta con la sesión del usuario.
// Es cliente solo por el botón de cerrar sesión; los datos del usuario
// llegan como props desde el servidor para evitar parpadeos de carga.
export function SessionBar({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-3.5">
        <Link
          href="/"
          className="text-sm font-medium tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          GitHub AI Helper
        </Link>
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
            <span className="hidden text-sm text-muted sm:inline">
              {name ?? "Usuario"}
            </span>
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
