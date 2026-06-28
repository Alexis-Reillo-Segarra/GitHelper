// Nombres de las cookies donde la web guarda la configuración del usuario.
//
// Réplica de la "tipología" de la CLI: en vez de OAuth, el usuario pega su token
// de GitHub y la API key de su proveedor de IA. Las credenciales viajan en
// cookies `httpOnly` (no accesibles desde JS de cliente); el proveedor y el
// modelo no son secretos y pueden ser legibles.
//
// Este módulo solo exporta constantes para que pueda importarse tanto desde el
// `proxy` (que inspecciona `request.cookies`) como desde el servidor.
export const COOKIE_GITHUB_TOKEN = "gh_token";
export const COOKIE_AI_KEY = "ai_key";
export const COOKIE_AI_PROVIDER = "ai_provider";
export const COOKIE_AI_MODEL = "ai_model";

// Las credenciales caducan a los 30 días; tras eso, el asistente vuelve a pedirlas.
export const CONFIG_MAX_AGE = 60 * 60 * 24 * 30;
