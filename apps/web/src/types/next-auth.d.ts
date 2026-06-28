import type { DefaultSession } from "next-auth";

// Augmentamos los tipos de NextAuth para exponer el access_token de GitHub.
declare module "next-auth" {
  interface Session {
    // Token OAuth del usuario para hablar con la API de GitHub.
    accessToken?: string;
    user: DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // Persistimos aquí el access_token entre peticiones.
    accessToken?: string;
  }
}
