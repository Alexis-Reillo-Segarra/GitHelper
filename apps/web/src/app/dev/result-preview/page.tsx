import { notFound } from "next/navigation";
import type { PRAnalysis } from "@repo/core";
import { ResultCard } from "@/app/components/ResultCard";

// Previsualización SOLO-DEV de `ResultCard` con datos mock. La página de PR real
// dispara una llamada a la IA y exige credenciales, así que no es testeable en un
// navegador sin secretos: esta ruta cubre ese hueco para los e2e visuales y para
// iterar el diseño sin pagar tokens. Se sirve en desarrollo siempre, y en
// producción solo si se activa explícitamente (lo hacen los e2e).
export const dynamic = "force-dynamic";

const previewHabilitado =
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_DEV_PREVIEW === "1";

const VARIANTES: { id: string; titulo: string; result: PRAnalysis }[] = [
    {
        id: "aprobar",
        titulo: "Veredicto óptimo",
        result: {
            resumen_ejecutivo:
                "Refactor menor que extrae la lógica de formateo a una función pura y añade tests. Cambio limpio y bien acotado.",
            posibles_bugs: [],
            apto_para_merge: true,
            puntuacion_codigo: 9,
            recomendacion: "aprobar",
        },
    },
    {
        id: "cambios-menores",
        titulo: "Avisos leves",
        result: {
            resumen_ejecutivo:
                "Añade un endpoint de salud y su test. La implementación es correcta pero quedan detalles de estilo y un log ruidoso.",
            posibles_bugs: [
                "[menor] El mensaje de log incluye el payload completo; podría filtrar datos en producción.",
                "[menor] Falta tipar el valor de retorno del handler.",
            ],
            apto_para_merge: true,
            puntuacion_codigo: 7,
            recomendacion: "cambios_menores",
        },
    },
    {
        id: "cambios-mayores",
        titulo: "Avisos relevantes",
        result: {
            resumen_ejecutivo:
                "Migra la capa de acceso a datos a un nuevo cliente. La dirección es buena pero hay validaciones ausentes y un caso de borde sin cubrir.",
            posibles_bugs: [
                "[mayor] No se valida la respuesta de la API antes de acceder a `data.items`; un 204 rompería el flujo.",
                "[mayor] La paginación ignora el cursor cuando hay más de 100 elementos.",
                "[menor] Variable `tmp` sin uso tras el refactor.",
            ],
            apto_para_merge: false,
            puntuacion_codigo: 5,
            recomendacion: "cambios_mayores",
        },
    },
    {
        id: "bloqueado",
        titulo: "Riesgo alto",
        result: {
            resumen_ejecutivo:
                "Introduce autenticación por token pero la verificación es incorrecta y deja una ruta sin proteger.",
            posibles_bugs: [
                "[critico] La comparación del token usa `==` con coerción; una cadena vacía pasaría la validación.",
                "[critico] La ruta `/admin` queda fuera del matcher del proxy y es accesible sin sesión.",
                "[mayor] El secreto se lee de una variable que no existe en producción.",
                "[menor] Mensajes de error inconsistentes entre handlers.",
            ],
            apto_para_merge: false,
            puntuacion_codigo: 2,
            recomendacion: "bloqueado",
        },
    },
    {
        id: "sin-clasificar",
        titulo: "Degradación · sin etiqueta",
        result: {
            resumen_ejecutivo:
                "Variante de prueba: un problema sin prefijo de severidad debe mostrarse igualmente, sin agrupar.",
            posibles_bugs: ["Problema reportado sin etiqueta de severidad."],
            apto_para_merge: true,
            puntuacion_codigo: 6,
            recomendacion: "cambios_menores",
        },
    },
];

export default function ResultPreviewPage() {
    if (!previewHabilitado) notFound();

    return (
        <main className="mx-auto w-full max-w-2xl space-y-12 px-6 py-12">
            <header>
                <h1 className="text-xl font-semibold tracking-tight">
                    Preview · ResultCard
                </h1>
                <p className="mt-1.5 text-sm text-muted">
                    Variantes del veredicto con datos mock (solo desarrollo).
                </p>
            </header>

            {VARIANTES.map((v) => (
                <section key={v.id} data-testid={`variant-${v.id}`}>
                    <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted">
                        {v.titulo}
                    </h2>
                    <ResultCard result={v.result} />
                </section>
            ))}
        </main>
    );
}
