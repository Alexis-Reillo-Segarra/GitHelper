import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";

// Configuración de NextAuth v5 (Auth.js).
// Lee por defecto las variables de entorno AUTH_SECRET, AUTH_GITHUB_ID y
// AUTH_GITHUB_SECRET, por lo que no es necesario pasarlas manualmente.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      // Pedimos acceso a los datos del usuario y a sus repos.
      authorization: { params: { scope: "read:user repo" } },
    }),
  ],
  callbacks: {
    // Persistimos el access_token de GitHub en el JWT la primera vez
    // (cuando `account` está presente, es decir, justo tras el login).
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    // Exponemos el token al cliente/servidor a través de la sesión.
    async session({ session, token }) {
      // En esta beta, el `token` del callback usa la interfaz JWT de
      // `@auth/core/jwt` (con índice `[key: string]: unknown`), por lo que
      // acotamos el tipo al leerlo.
      session.accessToken = token.accessToken as string | undefined;
      return session;
    },
  },
});
