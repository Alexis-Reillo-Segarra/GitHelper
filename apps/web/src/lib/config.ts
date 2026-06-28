import { cookies } from "next/headers";
import type { AIProvider } from "@repo/core";
import {
  COOKIE_AI_KEY,
  COOKIE_AI_MODEL,
  COOKIE_AI_PROVIDER,
  COOKIE_GITHUB_TOKEN,
} from "./cookies";

// Configuración resuelta del usuario, leída de las cookies en el servidor.
export type WebConfig = {
  githubToken: string;
  provider: AIProvider;
  model?: string;
  aiKey: string;
};

/**
 * Lee la configuración desde las cookies de la petición. Devuelve `null` si
 * falta alguna credencial obligatoria (token de GitHub o clave de IA), lo que
 * indica que el usuario aún no ha completado el asistente.
 */
export async function readConfig(): Promise<WebConfig | null> {
  const store = await cookies();
  const githubToken = store.get(COOKIE_GITHUB_TOKEN)?.value;
  const aiKey = store.get(COOKIE_AI_KEY)?.value;
  const provider = store.get(COOKIE_AI_PROVIDER)?.value;
  const model = store.get(COOKIE_AI_MODEL)?.value;

  if (!githubToken || !aiKey || !provider) return null;

  return {
    githubToken,
    aiKey,
    provider: provider as AIProvider,
    model: model || undefined,
  };
}
