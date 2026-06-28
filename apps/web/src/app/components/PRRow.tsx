import Link from "next/link";
import type { PendingPR } from "@repo/core";
import { timeAgo } from "@/lib/format";

// Fila de un PR pendiente: enlaza a su pantalla de análisis. Presentacional.
export function PRRow({ pr }: { pr: PendingPR }) {
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
