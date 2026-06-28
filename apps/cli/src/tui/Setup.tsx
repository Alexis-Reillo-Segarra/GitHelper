import { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { AI_PROVIDERS, type ModelInfo, type ProviderInfo } from "@repo/core";
import { setConfig, type ConfigKey } from "../config";
import { colors } from "./theme";
import { HintBar, Panel } from "./ui";

type Step = "provider" | "model" | "aikey" | "github";

// Cabecera de cada paso: título destacado + subtítulo tenue.
function StepHeading({ title, hint }: { title: string; hint?: string }) {
    return (
        <Box flexDirection="column" marginBottom={1}>
            <Text bold color={colors.fg}>
                {title}
            </Text>
            {hint ? <Text color={colors.dim}>{hint}</Text> : null}
        </Box>
    );
}

// Marcador de fila seleccionada, coherente en todos los selectores.
function Row({ active, children }: { active: boolean; children: React.ReactNode }) {
    return (
        <Box>
            <Text color={active ? colors.accent : colors.faint} bold>
                {active ? "▍ " : "  "}
            </Text>
            {children}
        </Box>
    );
}

// Selector de proveedor de IA con icono, navegable con ↑↓.
// Bajo la lista se muestra el detalle (modelo y dónde sacar la clave) del
// proveedor resaltado, para que la elección sea informada.
function ProviderSelect({
    idx,
    setIdx,
    onSelect,
    onBack,
}: {
    idx: number;
    setIdx: (updater: (i: number) => number) => void;
    onSelect: (p: ProviderInfo) => void;
    onBack?: () => void;
}) {
    useInput((_input, key) => {
        if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setIdx((i) => Math.min(AI_PROVIDERS.length - 1, i + 1));
        if (key.return) onSelect(AI_PROVIDERS[idx]!);
        if (key.escape) onBack?.();
    });
    const current = AI_PROVIDERS[idx]!;
    return (
        <Panel>
            <StepHeading
                title="Elige tu proveedor de IA"
                hint="Lo usaré para revisar tus PRs. Podrás cambiarlo luego."
            />
            <Box flexDirection="column">
                {AI_PROVIDERS.map((p, i) => {
                    const active = i === idx;
                    return (
                        <Row key={p.id} active={active}>
                            <Text color={active ? colors.fg : colors.muted} bold={active}>
                                {`${p.icon}  ${p.label}`}
                            </Text>
                        </Row>
                    );
                })}
            </Box>
            <Box marginTop={1} flexDirection="column">
                <Box>
                    <Text color={colors.dim}>{"modelo  "}</Text>
                    <Text color={colors.accent}>{current.defaultModel}</Text>
                </Box>
                <Box>
                    <Text color={colors.dim}>{"clave   "}</Text>
                    <Text color={colors.muted}>{current.apiKeyUrl}</Text>
                </Box>
            </Box>
        </Panel>
    );
}

// Selector del modelo concreto del proveedor (Haiku/Sonnet/Opus, etc.).
// Guarda AI_MODEL; si solo hay un modelo sugerido, el paso se omite arriba.
function ModelSelect({
    provider,
    idx,
    setIdx,
    onSelect,
    onBack,
}: {
    provider: ProviderInfo;
    idx: number;
    setIdx: (updater: (i: number) => number) => void;
    onSelect: (m: ModelInfo) => void;
    onBack?: () => void;
}) {
    const models = provider.models;
    useInput((_input, key) => {
        if (key.upArrow) setIdx((i) => Math.max(0, i - 1));
        if (key.downArrow) setIdx((i) => Math.min(models.length - 1, i + 1));
        if (key.return) onSelect(models[idx] ?? models[0]!);
        if (key.escape) onBack?.();
    });
    const current = models[idx] ?? models[0]!;
    return (
        <Panel>
            <StepHeading
                title={`${provider.icon}  Elige el modelo de ${provider.label}`}
                hint="Más capaz = mejores reviews pero más lento y caro."
            />
            <Box flexDirection="column">
                {models.map((m, i) => {
                    const active = i === idx;
                    const isDefault = m.id === provider.defaultModel;
                    return (
                        <Row key={m.id} active={active}>
                            <Text color={active ? colors.fg : colors.muted} bold={active}>
                                {m.label}
                            </Text>
                            {isDefault ? (
                                <Text color={colors.dim}>{"  · por defecto"}</Text>
                            ) : null}
                        </Row>
                    );
                })}
            </Box>
            <Box marginTop={1}>
                <Text color={colors.dim}>{"AI_MODEL  "}</Text>
                <Text color={colors.accent}>{current.id}</Text>
            </Box>
        </Panel>
    );
}

// Input de la API key del proveedor elegido (enmascarado).
function KeyInput({
    provider,
    onSubmit,
    onBack,
}: {
    provider: ProviderInfo;
    onSubmit: (value: string) => void;
    onBack?: () => void;
}) {
    const [value, setValue] = useState("");
    // TextInput captura el resto del teclado; aquí solo escuchamos Esc (atrás).
    useInput((_input, key) => {
        if (key.escape) onBack?.();
    });
    return (
        <Panel>
            <StepHeading
                title={`${provider.icon}  Configura tu clave de ${provider.label}`}
                hint={`Consíguela en ${provider.apiKeyUrl}`}
            />
            <Box>
                <Text color={colors.accent} bold>{`${provider.apiKeyEnv} ▸ `}</Text>
                <TextInput
                    value={value}
                    onChange={setValue}
                    onSubmit={(v) => v.trim() && onSubmit(v.trim())}
                    mask="•"
                    placeholder="pega tu clave…"
                />
            </Box>
        </Panel>
    );
}

// Input del token de GitHub (con guía de dónde generarlo).
function GithubInput({
    onSubmit,
    onBack,
}: {
    onSubmit: (value: string) => void;
    onBack?: () => void;
}) {
    const [value, setValue] = useState("");
    useInput((_input, key) => {
        if (key.escape) onBack?.();
    });
    return (
        <Panel>
            <StepHeading
                title="Conecta tu cuenta de GitHub"
                hint="Necesito un token para listar tus Pull Requests pendientes."
            />
            <Text color={colors.dim}>
                {"Genéralo en https://github.com/settings/tokens (scope: repo) y pégalo aquí."}
            </Text>
            <Box marginTop={1}>
                <Text color={colors.accent} bold>
                    {"GITHUB_TOKEN ▸ "}
                </Text>
                <TextInput
                    value={value}
                    onChange={setValue}
                    onSubmit={(v) => v.trim() && onSubmit(v.trim())}
                    mask="•"
                    placeholder="ghp_…"
                />
            </Box>
        </Panel>
    );
}

function StepDots({ total, current }: { total: number; current: number }) {
    return (
        <Box>
            <Text>
                {Array.from({ length: total }, (_, i) => (
                    <Text key={i} color={i === current ? colors.accent : colors.faint}>
                        {i === current ? "●" : "○"}
                        {i < total - 1 ? " " : ""}
                    </Text>
                ))}
            </Text>
            <Text color={colors.dim}>{`  paso ${current + 1}/${total}`}</Text>
        </Box>
    );
}

// Atajos del pie, adaptados al paso actual (en el selector se navega con ↑↓;
// en los inputs se escribe y se confirma con ⏎).
function SetupFooter({
    step,
    total,
    current,
    canGoBack,
}: {
    step: Step;
    total: number;
    current: number;
    canGoBack: boolean;
}) {
    const keys: [string, string][] =
        step === "provider" || step === "model"
            ? [
                  ["↑↓", "elegir"],
                  ["⏎", "continuar"],
              ]
            : [["⏎", "guardar"]];
    if (canGoBack) keys.push(["esc", "atrás"]);
    keys.push(["ctrl+c", "salir"]);
    return (
        <Box paddingX={1} justifyContent="space-between" columnGap={2} flexWrap="wrap">
            {total > 1 ? <StepDots total={total} current={current} /> : <Box />}
            <HintBar keys={keys} />
        </Box>
    );
}

/**
 * Asistente de primera configuración. Pide solo lo que falte:
 * proveedor de IA + su clave (si no hay) y/o el token de GitHub (si no hay).
 * Gestiona su propio pie de página (atajos + progreso) y el teclado de cada paso.
 */
export function Setup({
    needProvider,
    needGithub,
    notice,
    onDone,
}: {
    needProvider: boolean;
    needGithub: boolean;
    notice?: string;
    onDone: () => void;
}) {
    const [stepIdx, setStepIdx] = useState(0);
    const [provider, setProvider] = useState<ProviderInfo | null>(null);
    // Los índices resaltados viven aquí para que persistan si se vuelve atrás.
    const [providerIdx, setProviderIdx] = useState(0);
    const [modelIdx, setModelIdx] = useState(0);

    // El paso de modelo solo aparece si el proveedor elegido ofrece más de uno;
    // por eso los pasos se recalculan cuando cambia el proveedor.
    const steps = useMemo<Step[]>(() => {
        const out: Step[] = [];
        if (needProvider) {
            out.push("provider");
            if (provider && provider.models.length > 1) out.push("model");
            out.push("aikey");
        }
        if (needGithub) out.push("github");
        return out;
    }, [needProvider, needGithub, provider]);

    function advance() {
        if (stepIdx + 1 >= steps.length) onDone();
        else setStepIdx((i) => i + 1);
    }
    function back() {
        setStepIdx((i) => Math.max(0, i - 1));
    }

    const step = steps[stepIdx]!;
    const canGoBack = stepIdx > 0;

    return (
        <Box flexDirection="column" flexGrow={1}>
            <Box paddingX={1} marginBottom={1}>
                {notice ? (
                    <Text color={colors.warn}>{`⚠  ${notice}`}</Text>
                ) : (
                    <Box>
                        <Text color={colors.accent} bold>
                            ¡Bienvenido!
                        </Text>
                        <Text color={colors.dim}>
                            {"  Vamos a dejar Git-Helper listo en unos segundos."}
                        </Text>
                    </Box>
                )}
            </Box>
            <Box flexGrow={1}>
                {step === "provider" ? (
                    <ProviderSelect
                        idx={providerIdx}
                        setIdx={setProviderIdx}
                        onSelect={(p) => {
                            setConfig("AI_PROVIDER", p.id);
                            process.env.AI_PROVIDER = p.id;
                            // Fijamos el modelo por defecto del proveedor (evita
                            // que quede un AI_MODEL de otro proveedor); el paso
                            // de modelo lo sobreescribe si el usuario elige otro.
                            setConfig("AI_MODEL", p.defaultModel);
                            process.env.AI_MODEL = p.defaultModel;
                            setProvider(p);
                            setModelIdx(0);
                            advance();
                        }}
                        onBack={canGoBack ? back : undefined}
                    />
                ) : step === "model" && provider ? (
                    <ModelSelect
                        provider={provider}
                        idx={modelIdx}
                        setIdx={setModelIdx}
                        onSelect={(m) => {
                            setConfig("AI_MODEL", m.id);
                            process.env.AI_MODEL = m.id;
                            advance();
                        }}
                        onBack={canGoBack ? back : undefined}
                    />
                ) : step === "aikey" && provider ? (
                    <KeyInput
                        provider={provider}
                        onSubmit={(value) => {
                            setConfig(provider.apiKeyEnv as ConfigKey, value);
                            process.env[provider.apiKeyEnv] = value;
                            advance();
                        }}
                        onBack={canGoBack ? back : undefined}
                    />
                ) : step === "github" ? (
                    <GithubInput
                        onSubmit={(value) => {
                            setConfig("GITHUB_TOKEN", value);
                            process.env.GITHUB_TOKEN = value;
                            advance();
                        }}
                        onBack={canGoBack ? back : undefined}
                    />
                ) : null}
            </Box>
            <SetupFooter
                step={step}
                total={steps.length}
                current={stepIdx}
                canGoBack={canGoBack}
            />
        </Box>
    );
}
