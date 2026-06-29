import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_AI_KEY, COOKIE_GITHUB_TOKEN } from "@/lib/cookies";

// En Next.js 16 el antiguo `middleware` se renombró a `proxy` (misma idea).
// Aquí ya no usamos OAuth: el usuario configura sus credenciales en el asistente
// y se guardan en cookies. Si faltan, redirigimos a `/login` (el asistente).
export default function proxy(request: NextRequest) {
  const configured =
    request.cookies.has(COOKIE_GITHUB_TOKEN) && request.cookies.has(COOKIE_AI_KEY);

  if (!configured) {
    return NextResponse.redirect(new URL("/login", request.nextUrl.origin));
  }
}

export const config = {
  matcher: [
    /*
     * Protege todas las rutas excepto:
     * - login (asistente de configuración)
     * - dev (previsualizaciones solo-dev de componentes; la propia ruta se
     *   bloquea en producción, así que no expone nada)
     * - api (los route handlers se autoprotegen y devuelven JSON 401)
     * - _next/static, _next/image (assets internos de Next)
     * - favicon.ico y archivos .svg (assets estáticos)
     */
    "/((?!login|dev|api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
