"use client";
import { useActionState } from "react";
import { toggleMonitor } from "@/app/actions";

export default function MonitorToggle({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(
    toggleMonitor.bind(null, id, !enabled),
    { message: "", success: false },
  );
  return (
    <form action={action} className="mt-4">
      <button
        disabled={pending}
        className="rounded-lg border border-slate-600 px-3 py-2 text-sm disabled:opacity-50"
      >
        {pending
          ? "Salvando…"
          : enabled
            ? "Pausar monitor"
            : "Habilitar monitor"}
      </button>
      <p
        aria-live="polite"
        className={`mt-2 text-sm ${state.success ? "text-emerald-300" : "text-red-300"}`}
      >
        {state.message}
      </p>
    </form>
  );
}
