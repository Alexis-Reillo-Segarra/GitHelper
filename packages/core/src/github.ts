// Cliente mínimo de la API REST de GitHub sobre `fetch` (global en Node 18+).
//
// Sustituye a @octokit/rest: solo necesitamos 6 endpoints GET, así que un
// wrapper fino evita arrastrar ~6,7 MB de dependencias (en su mayoría tipos
// generados) y ~47 ms de arranque. A cambio, asumimos nosotros la
// autenticación y la normalización de errores; los mensajes preservan el
// código de estado y el mensaje de GitHub ("Bad credentials", etc.) para que
// la UI siga detectando fallos de credenciales.

const GITHUB_API = "https://api.github.com";

export type GitHubRequestOptions = {
    /** Cabecera Accept (p. ej. el formato diff). Por defecto JSON. */
    accept?: string;
    /** Si true, devuelve el cuerpo como texto plano en vez de JSON. */
    raw?: boolean;
    /** Parámetros de query (se serializan y omiten los `undefined`). */
    query?: Record<string, string | number | undefined>;
};

/** Error de la API de GitHub con el código de estado accesible. */
export class GitHubApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
        this.name = "GitHubApiError";
    }
}

export class GitHubClient {
    constructor(private readonly token?: string) {}

    async request<T>(path: string, opts: GitHubRequestOptions = {}): Promise<T> {
        const url = new URL(`${GITHUB_API}${path}`);
        if (opts.query) {
            for (const [k, v] of Object.entries(opts.query)) {
                if (v !== undefined) url.searchParams.set(k, String(v));
            }
        }

        const headers: Record<string, string> = {
            Accept: opts.accept ?? "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "git-helper",
        };
        if (this.token) headers.Authorization = `Bearer ${this.token}`;

        const res = await fetch(url, { headers });

        if (!res.ok) {
            // Intentamos extraer el `message` de GitHub; si no, usamos el statusText.
            let detail = res.statusText;
            try {
                const body = (await res.json()) as { message?: string };
                if (body?.message) detail = body.message;
            } catch {
                // cuerpo no-JSON: nos quedamos con el statusText
            }
            // El mensaje incluye el estado y el detalle de GitHub para que
            // isGithubAuthError (401/403/"bad credentials") siga funcionando.
            throw new GitHubApiError(res.status, `GitHub API ${res.status}: ${detail}`);
        }

        return (opts.raw ? await res.text() : await res.json()) as T;
    }
}

// ── Formas crudas de la API que consumimos (solo los campos usados) ──────────

export type GhUser = {
    login: string;
    name: string | null;
    avatar_url: string;
};

export type GhRepo = {
    name: string;
    full_name: string;
    private: boolean;
    description: string | null;
    updated_at: string | null;
    owner: { login: string };
};

export type GhPull = {
    number: number;
    title: string;
    created_at: string;
    html_url: string;
    user: { login: string } | null;
};

export type GhPullDetail = GhPull & {
    head: { sha: string };
};

export type GhSearchItem = {
    number: number;
    title: string;
    created_at: string;
    html_url: string;
    repository_url: string;
    draft?: boolean;
    user: { login: string } | null;
};

export type GhSearchResult = {
    items: GhSearchItem[];
};
