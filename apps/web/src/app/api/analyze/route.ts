import { NextResponse } from "next/server";
import { z } from "zod";
import { GitHubAIService } from "@repo/core";

// Validación de la petición con Zod
const RequestSchema = z.object({
    owner: z.string().min(1, "El owner es obligatorio"),
    repo: z.string().min(1, "El repo es obligatorio"),
    pr: z.coerce.number().int().positive("El PR debe ser un entero positivo"),
});

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const parsed = RequestSchema.safeParse(body);
        if (!parsed.success) {
            const message =
                parsed.error.issues[0]?.message || "Parámetros inválidos";
            return NextResponse.json({ message }, { status: 400 });
        }

        const { owner, repo, pr } = parsed.data;

        // ¡MAGIA DEL MONOREPO! Importamos el core directamente en la API de Next.js
        const service = new GitHubAIService(process.env.GITHUB_TOKEN);
        const analysis = await service.analyzePR(owner, repo, pr);

        return NextResponse.json(analysis);
    } catch (error) {
        // Logueamos el error completo en el servidor, pero no lo filtramos al cliente
        console.error(error);
        return NextResponse.json(
            { message: "Error interno del servidor" },
            { status: 500 }
        );
    }
}
