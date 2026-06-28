"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { GitHubAIService, GitHubApiError, getProvider } from "@repo/core";
import {
  COOKIE_AI_KEY,
  COOKIE_AI_MODEL,
  COOKIE_AI_PROVIDER,
  COOKIE_GITHUB_TOKEN,
  CONFIG_MAX_AGE,
} from "@/lib/cookies";

// Validación de la entrada del asistente de configuración.
const ConfigSchema = z.object({
  provider: z.string().min(1, "Elige un proveedor de IA"),
  model: z.string().optional(),
  aiKey: z.string().min(1, "Pega la API key de tu proveedor de IA"),
  githubToken: z.string().min(1, "Pega tu token de GitHub"),
});

export type SaveConfigInput = z.infer<typeof ConfigSchema>;
export type SaveConfigResult = { error: string } | undefined;

// Opciones comunes de las cookies. Los secretos van como `httpOnly` para que el
// JS de cliente no pueda leerlos; `secure` solo en producción (en local es HTTP).
function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONFIG_MAX_AGE,
  };
}

/**
 * Guarda la configuración del asistente. Antes de persistir, verifica el token
 * de GitHub haciendo una llamada real a la API: así el usuario recibe feedback
 * inmediato si el token es inválido, en vez de fallar más tarde al cargar PRs.
 * En caso de éxito redirige al panel; si hay error, lo devuelve para mostrarlo.
 */
export async function saveConfig(input: SaveConfigInput): Promise<SaveConfigResult> {
  const parsed = ConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const { provider, model, aiKey, githubToken } = parsed.data;

  const providerInfo = getProvider(provider);
  if (!providerInfo) {
    return { error: `Proveedor de IA no reconocido: "${provider}"` };
  }

  // Verificamos el token de GitHub contra la API antes de guardarlo.
  try {
    await new GitHubAIService(githubToken).getAuthenticatedUser();
  } catch (e) {
    if (e instanceof GitHubApiError && (e.status === 401 || e.status === 403)) {
      return {
        error:
          "El token de GitHub no es válido o no tiene permisos. Genera uno nuevo con scope 'repo'.",
      };
    }
    return {
      error: "No se pudo verificar el token de GitHub. Revisa tu conexión e inténtalo de nuevo.",
    };
  }

  const store = await cookies();
  store.set(COOKIE_GITHUB_TOKEN, githubToken, cookieOptions(true));
  store.set(COOKIE_AI_KEY, aiKey, cookieOptions(true));
  store.set(COOKIE_AI_PROVIDER, providerInfo.id, cookieOptions(false));
  store.set(COOKIE_AI_MODEL, model || providerInfo.defaultModel, cookieOptions(false));

  redirect("/");
}

/** Borra toda la configuración y vuelve al asistente. */
export async function clearConfig(): Promise<void> {
  const store = await cookies();
  for (const name of [
    COOKIE_GITHUB_TOKEN,
    COOKIE_AI_KEY,
    COOKIE_AI_PROVIDER,
    COOKIE_AI_MODEL,
  ]) {
    store.delete(name);
  }
  redirect("/login");
}
