import { useEffect, useState } from "react";
import { Box, Text, useApp, useInput, useStdout } from "ink";
import Spinner from "ink-spinner";
import {
    GitHubAIService,
    type PendingPR,
    type PRAnalysis,
    type Recomendacion,
} from "@repo/core";
import { colors } from "./theme";

type View = "list" | "analysis";

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
    const keys =
        view === "list"
            ? [
                  ["↑↓", "navegar"],
                  ["⏎", "analizar"],
                  ["r", "refrescar"],
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
            <Box paddingX={1} paddingY={1}>
                <Text color={colors.bad}>{`✗ ${error}`}</Text>
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
                            <Text color={active ? colors.fg : colors.gray} bold={active} wrap="truncate-end">
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

export function App({ token }: { token?: string }) {
    const { exit } = useApp();
    const { stdout } = useStdout();
    const rows = stdout?.rows ?? 24;

    const [prs, setPrs] = useState<PendingPR[]>([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState<string | null>(null);
    const [selected, setSelected] = useState(0);

    const [view, setView] = useState<View>("list");
    const [refLabel, setRefLabel] = useState("");
    const [analysis, setAnalysis] = useState<PRAnalysis | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState<string | null>(null);

    const service = new GitHubAIService(token);

    async function loadList() {
        setLoading(true);
        setListError(null);
        if (!token) {
            setLoading(false);
            setListError("Necesitas un GITHUB_TOKEN. Guárdalo con: git-helper config set GITHUB_TOKEN ghp_…");
            return;
        }
        try {
            const data = await service.listPendingPullRequests();
            setPrs(data);
            setSelected(0);
        } catch (e: any) {
            setListError(e?.message ?? String(e));
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function analyze(pr: PendingPR) {
        const ref = `${pr.full_name} #${pr.number}`;
        setRefLabel(ref);
        setView("analysis");
        setAnalysis(null);
        setAnalyzeError(null);
        setAnalyzing(true);
        try {
            const result = await service.analyzePR(pr.owner, pr.repo, pr.number);
            setAnalysis(result);
        } catch (e: any) {
            setAnalyzeError(e?.message ?? String(e));
        } finally {
            setAnalyzing(false);
        }
    }

    useInput((input, key) => {
        if (input === "q") {
            exit();
            return;
        }
        if (view === "list") {
            if (key.upArrow) setSelected((s) => Math.max(0, s - 1));
            if (key.downArrow) setSelected((s) => Math.min(prs.length - 1, s + 1));
            if (key.return && prs[selected]) void analyze(prs[selected]);
            if (input === "r") void loadList();
        } else if (view === "analysis") {
            if (key.escape) setView("list");
        }
    });

    return (
        <Box flexDirection="column" height={rows}>
            <Header />
            <Box flexGrow={1} flexDirection="column">
                {view === "list" ? (
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
            <StatusBar view={view} />
        </Box>
    );
}
