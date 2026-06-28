import { useEffect, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import {
    GitHubAIService,
    GitHubApiError,
    getProvider,
    type PendingPR,
    type PRAnalysis,
    type Recomendacion,
} from "@repo/core";
import { Setup } from "./Setup";
import { colors } from "./theme";
import { Mascot, MASCOT_ROWS } from "./mascot";
import { HintBar, Logo, LOGO_WIDTH, Panel, StatusLine, useTerminalSize, Wordmark } from "./ui";
import { relativeTime } from "../ui/time";

type View = "setup" | "list" | "analysis";

// ¿Falta elegir proveedor de IA o su clave?
function aiSetupMissing(): boolean {
    const provider = process.env.AI_PROVIDER;
    if (!provider) return true;
    const info = getProvider(provider);
    if (!info) return true;
    return !process.env[info.apiKeyEnv];
}

// ¿El fallo es de credenciales de GitHub (token inválido/caducado)? Nos fiamos
// del código de estado HTTP del cliente, no del texto: un 401 es siempre
// credenciales. Otros estados de GitHub (403 rate-limit/permiso, 404, 5xx) NO
// son un problema de credenciales y se muestran tal cual.
function isGithubCredentialError(e: unknown): boolean {
    return e instanceof GitHubApiError && e.status === 401;
}

// ¿El fallo viene de una API key del proveedor de IA inválida/caducada? Solo se
// evalúa para errores que NO son de GitHub (los de GitHub son GitHubApiError),
// así un 403 de GitHub nunca se confunde con un fallo de la clave de IA.
function isAiAuthError(msg: string): boolean {
    return /api[\s_-]?key|x-api-key|invalid.*key|incorrect api key|authentication|unauthorized|401|403/i.test(
        msg,
    );
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

// Barra de puntuación ▓▓▓▓▓░░░░░ con color según el tramo.
function ScoreBar({ score }: { score: number }) {
    const filled = Math.max(0, Math.min(10, Math.round(score)));
    const color = score >= 8 ? colors.ok : score >= 5 ? colors.warn : colors.bad;
    return (
        <Text>
            <Text color={color}>{"▰".repeat(filled)}</Text>
            <Text color={colors.faint}>{"▱".repeat(10 - filled)}</Text>
            <Text color={color} bold>{`  ${score}/10`}</Text>
        </Text>
    );
}

// Nº de PRs por página: cuando hay más, la lista se pagina para no desbordar.
const PAGE_SIZE = 5;

// ── Lista de PRs pendientes ────────────────────────────────────────────────
function PRListView({
    prs,
    selected,
    loading,
    error,
    compact,
}: {
    prs: PendingPR[];
    selected: number;
    loading: boolean;
    error: string | null;
    // En terminales estrechas omitimos el repo del metadato para no descuadrar.
    compact: boolean;
}) {
    if (loading) {
        return (
            <Box>
                <Text color={colors.accent}>
                    <Spinner type="dots" />
                </Text>
                <Text color={colors.muted}>{" Cargando tus PRs pendientes…"}</Text>
            </Box>
        );
    }
    if (error) {
        return (
            <Box flexDirection="column">
                <Text color={colors.bad}>{`✗ ${error}`}</Text>
                <Box marginTop={1}>
                    <Text color={colors.dim}>{"Pulsa "}</Text>
                    <Text color={colors.accent} bold>
                        s
                    </Text>
                    <Text color={colors.dim}>
                        {" para reintroducir tu proveedor de IA y token de GitHub."}
                    </Text>
                </Box>
            </Box>
        );
    }
    if (prs.length === 0) {
        return <Text color={colors.ok}>✓ No tienes PRs pendientes. ¡Todo limpio!</Text>;
    }
    // Paginación: mostramos solo la página que contiene el PR seleccionado.
    const total = prs.length;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    const page = Math.floor(selected / PAGE_SIZE);
    const start = page * PAGE_SIZE;
    const visible = prs.slice(start, start + PAGE_SIZE);
    return (
        <Box flexDirection="column">
            {visible.map((pr, idx) => {
                const i = start + idx;
                const active = i === selected;
                return (
                    <Box key={`${pr.full_name}#${pr.number}`} gap={1}>
                        <Text color={active ? colors.accent : colors.faint} bold>
                            {active ? "▍" : " "}
                        </Text>
                        <Box flexGrow={1} flexShrink={1} minWidth={6} overflow="hidden">
                            <Text
                                color={active ? colors.fg : colors.muted}
                                bold={active}
                                wrap="truncate-end"
                            >
                                {pr.title}
                            </Text>
                        </Box>
                        <Box flexShrink={0}>
                            {compact ? null : (
                                <Text color={colors.dim}>{`${pr.full_name} `}</Text>
                            )}
                            <Text color={colors.muted}>{`#${pr.number}`}</Text>
                            <Text color={colors.faint}>{`  ·  ${relativeTime(pr.created_at)}`}</Text>
                        </Box>
                    </Box>
                );
            })}
            {pageCount > 1 ? (
                <Box marginTop={1} justifyContent="space-between">
                    <Text color={colors.dim}>{`Página ${page + 1}/${pageCount}`}</Text>
                    <Text color={colors.faint}>
                        {`${start + 1}–${Math.min(start + PAGE_SIZE, total)} de ${total}`}
                    </Text>
                </Box>
            ) : null}
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
        <Panel title={refLabel}>
            {analyzing ? (
                <Box>
                    <Text color={colors.accent}>
                        <Spinner type="dots" />
                    </Text>
                    <Text color={colors.muted}>{" Analizando con IA…"}</Text>
                </Box>
            ) : error ? (
                <Text color={colors.bad}>{`✗ ${error}`}</Text>
            ) : analysis ? (
                <Box flexDirection="column" gap={1}>
                    <Box gap={4}>
                        <Box>
                            <Text color={colors.dim}>{"Puntuación  "}</Text>
                            <ScoreBar score={analysis.puntuacion_codigo} />
                        </Box>
                        <Box>
                            <Text color={colors.dim}>{"Veredicto  "}</Text>
                            <Text color={RECO_COLOR[analysis.recomendacion]} bold>
                                {`● ${RECO_LABEL[analysis.recomendacion]}`}
                            </Text>
                        </Box>
                    </Box>
                    <Text color={colors.muted}>{analysis.resumen_ejecutivo}</Text>
                    {analysis.posibles_bugs.length > 0 ? (
                        <Box flexDirection="column">
                            <Text color={colors.warn} bold>
                                Posibles bugs
                            </Text>
                            {analysis.posibles_bugs.map((b, i) => (
                                <Box key={i}>
                                    <Text color={colors.faint}>{" • "}</Text>
                                    <Text color={colors.fg}>{b}</Text>
                                </Box>
                            ))}
                        </Box>
                    ) : (
                        <Text color={colors.ok}>✓ Sin bugs evidentes.</Text>
                    )}
                </Box>
            ) : null}
        </Panel>
    );
}

export function App({ token: initialToken }: { token?: string }) {
    const { exit } = useApp();
    const { columns, rows } = useTerminalSize();
    // El logo grande en bloques solo cabe en terminales suficientemente anchas
    // y altas; si no, caemos al wordmark compacto para no desbordar/descuadrar.
    const showBigLogo = columns >= LOGO_WIDTH + 4 && rows >= 22;
    // La mascota (pequeña) corona el menú cuando hay altura de sobra para ella
    // más el logo grande y el panel; si no, se cae al logo o al wordmark.
    const showMascot = columns >= LOGO_WIDTH + 4 && rows >= MASCOT_ROWS + 16;

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
            if (isGithubCredentialError(e)) {
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
            // Distinguimos qué credencial falló para re-solicitar solo esa.
            // GitHub primero (la descarga del diff): un 401 → re-pedir token.
            if (isGithubCredentialError(e)) {
                setSetupNotice(
                    "Tu token de GitHub no es válido o ha caducado. Vuelve a introducirlo.",
                );
                setNeeds({ provider: false, github: true });
                setView("setup");
                return;
            }
            // Solo los errores que NO son de GitHub pueden ser de la clave de IA
            // (un 403 de GitHub, p. ej. rate-limit, no debe pedir la clave de IA).
            if (!(e instanceof GitHubApiError) && isAiAuthError(msg)) {
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
                // ←/→ saltan de página completa (5 en 5).
                if (key.leftArrow) setSelected((s) => Math.max(0, s - PAGE_SIZE));
                if (key.rightArrow)
                    setSelected((s) => Math.min(prs.length - 1, s + PAGE_SIZE));
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

    const listKeys: [string, string][] = [
        ["↑↓", "navegar"],
        // El salto de página solo tiene sentido cuando la lista está paginada.
        ...(prs.length > PAGE_SIZE
            ? ([["←→", "página"]] as [string, string][])
            : []),
        ["⏎", "analizar"],
        ["r", "refrescar"],
        ["s", "configurar"],
        ["q", "salir"],
    ];
    const analysisKeys: [string, string][] = [
        ["esc", "volver"],
        ["q", "salir"],
    ];

    // ── Vista: setup ─────────────────────────────────────────────────────────
    if (view === "setup") {
        return (
            <Box flexDirection="column" height={rows} paddingX={2} paddingTop={1}>
                <Wordmark />
                <Box flexGrow={1} flexDirection="column" marginTop={1}>
                    <Setup
                        needProvider={needs.provider}
                        needGithub={needs.github}
                        notice={setupNotice ?? undefined}
                        onDone={onSetupDone}
                    />
                </Box>
            </Box>
        );
    }

    // ── Vista: análisis ──────────────────────────────────────────────────────
    if (view === "analysis") {
        return (
            <Box flexDirection="column" height={rows} paddingX={2} paddingTop={1}>
                <Wordmark />
                <Box flexGrow={1} flexDirection="column" marginTop={1}>
                    <AnalysisView
                        refLabel={refLabel}
                        analyzing={analyzing}
                        analysis={analysis}
                        error={analyzeError}
                    />
                </Box>
                <Box
                    justifyContent="space-between"
                    columnGap={2}
                    flexWrap="wrap"
                    paddingX={1}
                >
                    <StatusLine mode="Review" />
                    <HintBar keys={analysisKeys} />
                </Box>
            </Box>
        );
    }

    // ── Vista: home / lista ──────────────────────────────────────────────────
    return (
        <Box flexDirection="column" height={rows} paddingX={2}>
            <Box
                flexGrow={1}
                flexDirection="column"
                justifyContent={showBigLogo || showMascot ? "center" : "flex-start"}
            >
                <Box
                    marginTop={showBigLogo || showMascot ? 0 : 1}
                    marginBottom={1}
                    flexDirection="column"
                    alignItems="center"
                >
                    {showMascot ? (
                        <>
                            <Mascot />
                            <Box marginTop={1}>
                                <Logo />
                            </Box>
                        </>
                    ) : showBigLogo ? (
                        <Logo />
                    ) : (
                        <Wordmark />
                    )}
                </Box>
                <Panel
                    title={
                        prs.length > 0
                            ? `  PRs pendientes · ${prs.length}`
                            : "  PRs pendientes"
                    }
                >
                    <PRListView
                        prs={prs}
                        selected={selected}
                        loading={loading}
                        error={listError}
                        compact={columns < 72}
                    />
                </Panel>
            </Box>
            <Box justifyContent="space-between" paddingX={1}>
                <StatusLine mode="Review" />
                <HintBar keys={listKeys} />
            </Box>
        </Box>
    );
}
