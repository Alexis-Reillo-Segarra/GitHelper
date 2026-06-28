import Link from "next/link";
import type { AIProvider } from "@repo/core";
import { clearConfig } from "@/app/actions";
import { GitHubMark, ProviderLogo } from "./ProviderLogo";

// Cabecera con la identidad del usuario (de su token de GitHub) y el proveedor
// de IA activo. "Cerrar sesión" borra las credenciales guardadas en cookies.
export function SessionBar({
  name,
  image,
  provider,
  model,
}: {
  name?: string | null;
  image?: string | null;
  provider?: AIProvider;
  model?: string | null;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-6 py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          <GitHubMark className="h-[18px] w-[18px]" />
          <span className="hidden sm:inline">GitHub AI Helper</span>
        </Link>

        <div className="flex items-center gap-3">
          {/* Proveedor de IA activo */}
          {provider ? (
            <span
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted sm:inline-flex"
              title={model ?? undefined}
            >
              <ProviderLogo id={provider} className="h-3.5 w-3.5" />
              <span className="max-w-[10rem] truncate">{model ?? provider}</span>
            </span>
          ) : null}

          {/* Usuario de GitHub */}
          <div className="flex items-center gap-2.5">
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
            <span className="hidden text-sm text-muted sm:inline">{name ?? "Usuario"}</span>
          </div>

          <form action={clearConfig}>
            <button
              type="submit"
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-card-hover hover:text-foreground"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
