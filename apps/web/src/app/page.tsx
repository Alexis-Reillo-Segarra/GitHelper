"use client";

import { useState } from "react";
import { PRAnalysis, PRAnalysisSchema } from "@repo/core";

// Definimos cómo será la llamada al servidor
async function fetchAnalysis(
  owner: string,
  repo: string,
  pr: number,
): Promise<PRAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner, repo, pr }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Error al analizar el PR");
  }

  return response.json();
}

export default function Home() {
  const [owner, setOwner] = useState("vercel");
  const [repo, setRepo] = useState("next.js");
  const [prNumber, setPrNumber] = useState("65000");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PRAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    const pr = parseInt(prNumber, 10);
    if (Number.isNaN(pr)) {
      setError("Introduce un número de PR válido");
      setIsLoading(false);
      return;
    }

    try {
      const data = await fetchAnalysis(owner, repo, pr);
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col items-center p-8">
      <h1 className="text-4xl font-bold mb-2 mt-10">GitHub AI Helper</h1>
      <p className="text-gray-400 mb-10">Analiza Pull Requests al instante</p>

      {/* Formulario */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-4 mb-10 bg-gray-900 p-6 rounded-xl shadow-lg border border-gray-800"
      >
        <input
          type="text"
          placeholder="Owner (ej: facebook)"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="text"
          placeholder="Repo (ej: react)"
          value={repo}
          onChange={(e) => setRepo(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <input
          type="number"
          placeholder="PR #"
          value={prNumber}
          onChange={(e) => setPrNumber(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white w-24 focus:ring-blue-500 focus:border-blue-500"
          required
        />
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? "Analizando..." : "Analizar PR"}
        </button>
      </form>

      {/* Errores */}
      {error && (
        <p className="text-red-400 bg-red-950 p-4 rounded-lg mb-6">{error}</p>
      )}

      {/* Resultados */}
      {result && (
        <div className="w-full max-w-2xl bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg space-y-4 animate-in fade-in">
          <div className="flex justify-between items-center border-b border-gray-800 pb-4">
            <h2 className="text-xl font-bold">Resultado del Análisis</h2>
            <span
              className={`text-2xl font-bold ${result.puntuacion_codigo >= 7 ? "text-green-400" : "text-red-400"}`}
            >
              {result.puntuacion_codigo}/10
            </span>
          </div>

          <p className="text-gray-300">
            <span className="font-semibold text-white">Resumen:</span>{" "}
            {result.resumen_ejecutivo}
          </p>

          <div
            className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${result.apto_para_merge ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"}`}
          >
            {result.apto_para_merge
              ? "✅ Apto para Merge"
              : "❌ NO Apto para Merge"}
          </div>

          {result.posibles_bugs.length > 0 && (
            <div className="pt-4 border-t border-gray-800">
              <h3 className="font-semibold text-red-400 mb-2">
                🐛 Posibles Bugs:
              </h3>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {result.posibles_bugs.map((bug, i) => (
                  <li key={i}>{bug}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
