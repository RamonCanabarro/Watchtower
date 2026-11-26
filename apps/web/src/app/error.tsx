"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-2xl rounded-xl border border-red-900 p-8">
        <h1 className="text-2xl font-semibold">
          Não foi possível carregar o Watchtower
        </h1>
        <p className="mt-4 text-slate-400">
          Confira se a API e o banco estão disponíveis e tente novamente.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            onClick={reset}
            className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950"
          >
            Tentar novamente
          </button>
          <Link href="/login" className="text-emerald-300 underline">
            Ir para o login
          </Link>
        </div>
      </div>
    </main>
  );
}
