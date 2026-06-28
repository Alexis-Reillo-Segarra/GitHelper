import { SetupWizard } from "@/app/components/SetupWizard";

// Asistente de configuración (sustituye al login OAuth). Pide el proveedor de
// IA, su API key y el token de GitHub, igual que la CLI.
export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <SetupWizard />
    </main>
  );
}
