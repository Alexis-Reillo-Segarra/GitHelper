import { useEffect, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";
import {
    GitHubAIService,
    getProvider,
    type PendingPR,
    type PRAnalysis,
    type Recomendacion,
} from "@repo/core";
import { Setup } from "./Setup";
import { colors } from "./theme";

type View = "setup" | "list" | "analysis";

// ¿Falta elegir proveedor de IA o su clave?
function aiSetupMissing(): boolean {
    const provider = process.env.AI_PROVIDER;
    if (!provider) return true;
    const info = getProvider(provider);
    if (!info) return true;
    return !process.env[info.apiKeyEnv];
}

// ¿El fallo viene de un token de GitHub inválido/caducado?
function isGithubAuthError(msg: string): boolean {
    return /bad credentials|requires authentication|unauthorized|401/i.test(msg);
}

// ¿El fallo viene de una API key del proveedor de IA inválida/caducada?
function isAiAuthError(msg: string): boolean {
    return /api[\s_-]?key|x-api-key|invalid.*key|incorrect api key|authentication|unauthorized|401|403/i.test(
        msg,
    );
}

function timeAgo(iso: string): string {
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    if (h < 24) return `${h}h`;
    return `${Math.floor(h / 24)}d`;
}

const RECO_LABEL: Record<Recomendacion, string> = {
    aprobar: "Aprobar",
    cambios_menores: "Cambios menores",
    cambios_mayores: "Cambios mayores",
    bloqueado: "Bloqueado",
};
const RECO_COLOR: Record<Recomendacion, string> = {
    aprobar: colors.ok,
    cambios_menores: colors.sky,
    cambios_mayores: colors.warn,
    bloqueado: colors.bad,
};

// ── Cabecera con mascota + título ──────────────────────────────────────────
function Header() {
    return (
        <Box
            borderStyle="round"
            borderColor={colors.purple}
            paddingX={1}
            justifyContent="space-between"
        >
            <Box>
                <Text color={colors.purpleLight}>{"⬡ "}</Text>
                <Text color={colors.purple} bold>
                    Git-Helper
                </Text>
                <Text color={colors.dim}>{"  ·  code review con IA"}</Text>
            </Box>
            <Text color={colors.dim}>🐙</Text>
        </Box>
    );
}

// ── Barra de estado inferior con atajos ────────────────────────────────────
function StatusBar({ view }: { view: View }) {
    const keys: [string, string][] =
        view === "list"
            ? [
                  ["↑↓", "navegar"],
                  ["⏎", "analizar"],
                  ["r", "refrescar"],
                  ["s", "configurar"],
                  ["q", "salir"],
              ]
            : [
                  ["esc", "volver"],
                  ["q", "salir"],
              ];
    return (
        <Box paddingX={1} gap={2}>
            {keys.map(([k, label]) => (
                <Box key={k}>
                    <Text color={colors.purpleLight} bold>
                        {k}
                    </Text>
                    <Text color={colors.dim}>{` ${label}`}</Text>
                </Box>
            ))}
        </Box>
    );
}

// ── Lista de PRs pendientes ────────────────────────────────────────────────
function PRListView({
    prs,
    selected,
    loading,
    error,
}: {
    prs: PendingPR[];
    selected: number;
    loading: boolean;
    error: string | null;
}) {
    if (loading) {
        return (
            <Box paddingX={1} paddingY={1}>
                <Text color={colors.purple}>
                    <Spinner type="dots" />
                </Text>
                <Text color={colors.gray}>{" Cargando tus PRs pendientes…"}</Text>
            </Box>
        );
    }
    if (error) {
        return (
            <Box paddingX={1} paddingY={1} flexDirection="column">
                <Text color={colors.bad}>{`✗ ${error}`}</Text>
                <Text color={colors.dim}>
                    {"Pulsa "}
                    <Text color={colors.purpleLight} bold>
                        s
                    </Text>
                    {" para volver a introducir tu proveedor de IA y token de GitHub."}
                </Text>
            </Box>
        );
    }
    if (prs.length === 0) {
        return (
            <Box paddingX={1} paddingY={1}>
                <Text color={colors.ok}>✓ No tienes PRs pendientes. ¡Todo limpio!</Text>
            </Box>
        );
    }
    return (
        <Box flexDirection="column" paddingX={1} paddingY={1}>
            {prs.map((pr, i) => {
                const active = i === selected;
                return (
                    <Box key={`${pr.full_name}#${pr.number}`}>
                        <Text color={active ? colors.purple : colors.dim}>
                            {active ? "▶ " : "  "}
                        </Text>
                        <Box width={50}>
                            <Text
                                color={active ? colors.fg : colors.gray}
                                bold={active}
                                wrap="truncate-end"
                            >
                                {pr.title}
                            </Text>
                        </Box>
                        <Text color={colors.dim}>{`  ${pr.full_name} #${pr.number} · ${timeAgo(pr.created_at)}`}</Text>
                    </Box>
                );
            })}
        </Box>
    );
}

// ── Vista de análisis de un PR ─────────────────────────────────────────────
function AnalysisView({
    refLabel,
    analyzing,
    analysis,
    error,
}: {
    refLabel: string;
    analyzing: boolean;
    analysis: PRAnalysis | null;
    error: string | null;
}) {
    return (
        <Box flexDirection="column" paddingX={1} paddingY={1}>
            <Text color={colors.purpleLight} bold>
                {refLabel}
            </Text>
            <Box marginTop={1} flexDirection="column">
                {analyzing ? (
                    <Box>
                        <Text color={colors.purple}>
                            <Spinner type="dots" />
                        </Text>
                        <Text color={colors.gray}>{" Analizando con IA…"}</Text>
                    </Box>
                ) : error ? (
                    <Text color={colors.bad}>{`✗ ${error}`}</Text>
                ) : analysis ? (
                    <Box flexDirection="column" gap={1}>
                        <Box>
                            <Text color={colors.dim}>{"Puntuación  "}</Text>
                            <Text
                                color={
                                    analysis.puntuacion_codigo >= 8
                                        ? colors.ok
                                        : analysis.puntuacion_codigo >= 5
                                          ? colors.warn
                                          : colors.bad
                                }
                                bold
                            >
                                {`${analysis.puntuacion_codigo}/10`}
                            </Text>
                            <Text color={colors.dim}>{"   Veredicto  "}</Text>
                            <Text color={RECO_COLOR[analysis.recomendacion]} bold>
                                {`● ${RECO_LABEL[analysis.recomendacion]}`}
                            </Text>
                        </Box>
                        <Text color={colors.gray}>{analysis.resumen_ejecutivo}</Text>
                        {analysis.posibles_bugs.length > 0 ? (
                            <Box flexDirection="column">
                                <Text color={colors.warn}>Posibles bugs:</Text>
                                {analysis.posibles_bugs.map((b, i) => (
                                    <Text key={i} color={colors.fg}>{`  • ${b}`}</Text>
                                ))}
                            </Box>
                        ) : (
                            <Text color={colors.ok}>✓ Sin bugs evidentes.</Text>
                        )}
                    </Box>
                ) : null}
            </Box>
        </Box>
    );
}

export function App({ token: initialToken }: { token?: string }) {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const rows = stdout?.rows ?? 24;

    // Qué falta configurar (al arrancar y también si el usuario pide reconfigurar
    // tras unas credenciales inválidas). El wizard lee estos flags.
    const [needs, setNeeds] = useState(() => ({
        provider: aiSetupMissing(),
        github: !(initialToken ?? process.env.GITHUB_TOKEN),
    }));
    const setupComplete = !needs.provider && !needs.github;

    const [token, setToken] = useState<string | undefined>(
        initialToken ?? process.env.GITHUB_TOKEN,
    );
    const [prs, setPrs] = useState<PendingPR[]>([]);
    const [loading, setLoading] = useState(setupComplete);
    const [listError, setListError] = useState<string | null>(null);
    const [selected, setSelected] = useState(0);

    const [view, setView] = useState<View>(setupComplete ? "list" : "setup");
    // Motivo por el que se muestra el asistente (p. ej. credencial caducada).
    const [setupNotice, setSetupNotice] = useState<string | null>(null);
    const [refLabel, setRefLabel] = useState("");
    const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);

    async function loadList(tok: string) {
        setLoading(true);
        setListError(null);
        try {
            const data = await new GitHubAIService(tok).listPendingPullRequests();
            setPrs(data);
            setSelected(0);
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            // Token inválido/caducado → volvemos a pedirlo automáticamente.
            if (isGithubAuthError(msg)) {
                setSetupNotice(
                    "Tu token de GitHub no es válido o ha caducado. Vuelve a introducirlo.",
                );
                setNeeds({ provider: false, github: true });
                setView("setup");
                return;
            }
            setListError(msg);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (setupComplete && token) void loadList(token);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // El wizard ya guardó todo en config + process.env; aquí recogemos el token.
    function onSetupDone() {
        const t = process.env.GITHUB_TOKEN;
        setToken(t);
        setSetupNotice(null);
        setView("list");
        if (t) void loadList(t);
    }

    // Relanza el asistente para reintroducir proveedor de IA + token de GitHub
    // (reconfiguración manual con la tecla 's').
    function startSetup() {
        setListError(null);
        setSetupNotice(null);
        setNeeds({ provider: true, github: true });
        setView("setup");
    }

    async function analyze(pr: PendingPR) {
        if (!token) return;
        setRefLabel(`${pr.full_name} #${pr.number}`);
        setView("analysis");
        setAnalysis(null);
        setAnalyzeError(null);
        setAnalyzing(true);
        try {
            const result = await new GitHubAIService(token).analyzePR(
                pr.owner,
                pr.repo,
                pr.number,
            );
            setAnalysis(result);
        } catch (e: any) {
            const msg = e?.message ?? String(e);
            // Distinguimos qué credencial falló para re-solicitar solo esa:
            // primero GitHub (la descarga del diff), luego el proveedor de IA.
            if (isGithubAuthError(msg)) {
                setSetupNotice(
                    "Tu token de GitHub no es válido o ha caducado. Vuelve a introducirlo.",
                );
                setNeeds({ provider: false, github: true });
                setView("setup");
                return;
            }
            if (isAiAuthError(msg)) {
                setSetupNotice(
                    "La API key de tu proveedor de IA no es válida o ha caducado. Vuelve a introducirla.",
                );
                setNeeds({ provider: true, github: false });
                setView("setup");
                return;
            }
            setAnalyzeError(msg);
        } finally {
            setAnalyzing(false);
        }
    }

    useInput(
        (input, key) => {
            if (input === "q") {
                exit();
                return;
            }
            if (view === "list") {
                if (key.upArrow) setSelected((s) => Math.max(0, s - 1));
                if (key.downArrow) setSelected((s) => Math.min(prs.length - 1, s + 1));
                if (key.return && prs[selected]) void analyze(prs[selected]);
                if (input === "r" && token) void loadList(token);
                if (input === "s") startSetup();
            } else if (view === "analysis") {
                if (key.escape) setView("list");
            }
        },
        // Durante el setup, los componentes del wizard gestionan el teclado.
        { isActive: view === "list" || view === "analysis" },
    );

    return (
        <Box flexDirection="column" height={rows}>
            <Header />
            <Box flexGrow={1} flexDirection="column">
                {view === "setup" ? (
                    <Setup
                        needProvider={needs.provider}
                        needGithub={needs.github}
                        notice={setupNotice ?? undefined}
                        onDone={onSetupDone}
                    />
                ) : view === "list" ? (
                    <PRListView prs={prs} selected={selected} loading={loading} error={listError} />
                ) : (
                    <AnalysisView
                        refLabel={refLabel}
                        analyzing={analyzing}
                        analysis={analysis}
                        error={analyzeError}
                    />
                )}
            </Box>
            {view === "setup" ? null : <StatusBar view={view} />}
        </Box>
    );
}
