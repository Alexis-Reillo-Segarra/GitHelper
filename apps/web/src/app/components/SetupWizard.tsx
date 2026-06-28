"use client";

import { useMemo, useState, useTransition } from "react";
import { AI_PROVIDERS, type ProviderInfo } from "@repo/core";
import { saveConfig } from "@/app/actions";
import { GitHubMark, ProviderLogo } from "./ProviderLogo";

type Step = "provider" | "model" | "aikey" | "github";

// Punto de progreso del asistente.
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i === current
              ? "w-6 bg-accent"
              : i < current
                ? "w-1.5 bg-accent/50"
                : "w-1.5 bg-border"
          }`}
        />
      ))}
    </div>
  );
}

// Campo secreto con botón de mostrar/ocultar.
function SecretInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  onEnter,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  onEnter?: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  return (
    <div className="relative">
      <input
        autoFocus={autoFocus}
        type={reveal ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
        }}
        placeholder={placeholder}
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 pr-16 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted/60 focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
      <button
        type="button"
        onClick={() => setReveal((r) => !r)}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-foreground"
      >
        {reveal ? "Ocultar" : "Mostrar"}
      </button>
    </div>
  );
}

export function SetupWizard({ notice }: { notice?: string }) {
  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [model, setModel] = useState<string>("");
  const [aiKey, setAiKey] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // El paso de modelo solo aparece si el proveedor ofrece más de uno.
  const steps = useMemo<Step[]>(() => {
    const out: Step[] = ["provider"];
    if (provider && provider.models.length > 1) out.push("model");
    out.push("aikey", "github");
    return out;
  }, [provider]);

  const [stepIdx, setStepIdx] = useState(0);
  const step = steps[Math.min(stepIdx, steps.length - 1)]!;

  function next() {
    setError(null);
    setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  }
  function back() {
    setError(null);
    setStepIdx((i) => Math.max(0, i - 1));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await saveConfig({
        provider: provider!.id,
        model: model || provider!.defaultModel,
        aiKey: aiKey.trim(),
        githubToken: githubToken.trim(),
      });
      // En caso de éxito el server action redirige; solo llegamos aquí si falla.
      if (result?.error) setError(result.error);
    });
  }

  const isLast = stepIdx === steps.length - 1;
  const canContinue =
    step === "provider"
      ? !!provider
      : step === "model"
        ? !!model
        : step === "aikey"
          ? aiKey.trim().length > 0
          : githubToken.trim().length > 0;

  return (
    <div className="w-full max-w-lg">
      {/* Cabecera de marca */}
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-card">
          <GitHubMark className="h-6 w-6 text-foreground" />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">GitHub AI Helper</h1>
        <p className="mt-1.5 text-sm text-muted">
          Configura tus credenciales para empezar a analizar Pull Requests.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <StepDots total={steps.length} current={stepIdx} />
          <span className="text-xs text-muted">
            Paso {stepIdx + 1} de {steps.length}
          </span>
        </div>

        {notice && stepIdx === 0 ? (
          <p className="mb-5 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 text-xs text-amber-300">
            {notice}
          </p>
        ) : null}

        {/* Paso: proveedor */}
        {step === "provider" ? (
          <div>
            <h2 className="text-sm font-medium text-foreground">Elige tu proveedor de IA</h2>
            <p className="mt-1 text-xs text-muted">
              Lo usaré para revisar tus PRs. Podrás cambiarlo cuando quieras.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {AI_PROVIDERS.map((p) => {
                const selected = provider?.id === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setProvider(p);
                      setModel(p.defaultModel);
                    }}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                      selected
                        ? "border-foreground/40 bg-card-hover ring-1 ring-foreground/20"
                        : "border-border bg-background hover:border-ring hover:bg-card-hover"
                    }`}
                  >
                    <ProviderLogo id={p.id} className="h-7 w-7 shrink-0" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {p.label}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {p.defaultModel}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Paso: modelo */}
        {step === "model" && provider ? (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ProviderLogo id={provider.id} className="h-5 w-5" />
              Elige el modelo de {provider.label}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Más capaz = mejores revisiones, pero más lento y caro.
            </p>
            <div className="mt-4 space-y-2">
              {provider.models.map((m) => {
                const selected = model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModel(m.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                      selected
                        ? "border-foreground/40 bg-card-hover ring-1 ring-foreground/20"
                        : "border-border bg-background hover:border-ring hover:bg-card-hover"
                    }`}
                  >
                    <span className="text-sm text-foreground">{m.label}</span>
                    <span
                      className={`h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
                        selected ? "border-foreground bg-foreground" : "border-border"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* Paso: API key del proveedor */}
        {step === "aikey" && provider ? (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <ProviderLogo id={provider.id} className="h-5 w-5" />
              Tu API key de {provider.label}
            </h2>
            <p className="mt-1 text-xs text-muted">
              Consíguela en{" "}
              <a
                href={provider.apiKeyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              >
                {new URL(provider.apiKeyUrl).host}
              </a>
              . Se guarda solo en una cookie de tu navegador.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block font-mono text-xs text-muted">
                {provider.apiKeyEnv}
              </label>
              <SecretInput
                autoFocus
                value={aiKey}
                onChange={setAiKey}
                placeholder="pega tu clave…"
                onEnter={() => canContinue && next()}
              />
            </div>
          </div>
        ) : null}

        {/* Paso: token de GitHub */}
        {step === "github" ? (
          <div>
            <h2 className="flex items-center gap-2 text-sm font-medium text-foreground">
              <GitHubMark className="h-5 w-5 text-foreground" />
              Tu token de GitHub
            </h2>
            <p className="mt-1 text-xs text-muted">
              Genéralo en{" "}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground underline decoration-border underline-offset-2 hover:decoration-foreground"
              >
                github.com/settings/tokens
              </a>{" "}
              con el scope <code className="rounded bg-background px-1 py-0.5 text-foreground">repo</code>.
            </p>
            <div className="mt-4">
              <label className="mb-1.5 block font-mono text-xs text-muted">GITHUB_TOKEN</label>
              <SecretInput
                autoFocus
                value={githubToken}
                onChange={setGithubToken}
                placeholder="ghp_…"
                onEnter={() => canContinue && submit()}
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="mt-5 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
            {error}
          </p>
        ) : null}

        {/* Navegación */}
        <div className="mt-7 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={stepIdx === 0 || pending}
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-0"
          >
            ← Atrás
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={submit}
              disabled={!canContinue || pending}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent-foreground/30 border-t-accent-foreground" />
                  Verificando…
                </>
              ) : (
                "Empezar"
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continuar
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-muted">
        Tus credenciales se guardan en cookies <code className="text-foreground">httpOnly</code> de
        tu navegador y solo se usan para hablar con GitHub y tu proveedor de IA.
      </p>
    </div>
  );
}
