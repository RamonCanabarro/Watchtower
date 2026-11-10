"use client";
import { useActionState } from "react";
import { createMonitor } from "@/app/actions";

export default function MonitorForm() {
  const [state, action, pending] = useActionState(createMonitor, {
    message: "",
    success: false,
  });
  const input =
    "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100";
  return (
    <details className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <summary className="cursor-pointer text-lg font-semibold">
        Cadastrar monitor
      </summary>
      <form action={action} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label>
          Nome
          <input
            className={input}
            name="name"
            required
            maxLength={120}
            autoComplete="off"
            placeholder="Minha API"
          />
        </label>
        <label>
          URL HTTP ou HTTPS
          <input
            className={input}
            name="url"
            type="url"
            required
            maxLength={2048}
            placeholder="https://example.com"
          />
        </label>
        <label>
          Intervalo em segundos
          <input
            className={input}
            name="interval"
            type="number"
            min={60}
            max={86400}
            step="any"
            defaultValue={60}
            required
          />
        </label>
        <label>
          Timeout em segundos
          <input
            className={input}
            name="timeout"
            type="number"
            min={1}
            max={30}
            step="any"
            defaultValue={5}
            required
          />
        </label>
        <div className="sm:col-span-2">
          <button
            disabled={pending}
            className="rounded-lg bg-emerald-400 px-5 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {pending ? "Cadastrando…" : "Cadastrar monitor"}
          </button>
          <p
            aria-live="polite"
            className={`mt-3 text-sm ${state.success ? "text-emerald-300" : "text-red-300"}`}
          >
            {state.message}
          </p>
        </div>
      </form>
    </details>
  );
}
