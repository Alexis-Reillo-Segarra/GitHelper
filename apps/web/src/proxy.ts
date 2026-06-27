import { auth } from "@/auth";

// En Next.js 16 el antiguo `middleware` se renombró a `proxy` (misma
// funcionalidad). Usamos el helper `auth` de NextAuth v5 como envoltorio:
// `req.auth` contiene la sesión (o null si no hay usuario autenticado).
export default auth((req) => {
  // Si NO hay sesión, redirigimos al login.
  // El `matcher` de abajo ya excluye /login, /api/auth y los assets estáticos,
  // por lo que aquí solo llegan rutas que deben estar protegidas.
  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    return Response.redirect(loginUrl);
  }
});

export const config = {
  matcher: [
    /*
     * Protege todas las rutas excepto:
     * - login (página de inicio de sesión)
     * - api/auth (endpoints OAuth de NextAuth)
     * - _next/static, _next/image (assets internos de Next)
     * - favicon.ico y otros assets estáticos comunes
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
