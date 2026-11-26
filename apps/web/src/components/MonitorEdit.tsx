"use client";
import { useActionState, useState } from "react";
import { editMonitor } from "@/app/actions";
import type { Monitor } from "@/lib/monitors";

function Editor({
  monitor,
  onClose,
}: {
  monitor: Monitor;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    name: monitor.name,
    url: monitor.url,
    interval: String(monitor.interval),
    timeout: String(monitor.timeout),
  });
  const [state, action, pending] = useActionState(
    editMonitor.bind(null, monitor.id),
    { message: "", success: false },
  );
  const input =
    "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100";
  return (
    <section
      aria-labelledby="edit-heading"
      className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-6"
    >
      <h2 id="edit-heading" className="text-xl font-semibold">
        Editar monitor
      </h2>
      <p className="mt-2 text-sm text-slate-400">
        O histórico será preservado. Alterar uma configuração agenda uma nova
        verificação se o monitor estiver habilitado.
      </p>
      <form action={action} className="mt-5">
        <fieldset disabled={pending} className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">Configuração do monitor</legend>
          <label>
            Nome
            <input
              className={input}
              name="name"
              required
              maxLength={120}
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
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
              value={draft.url}
              onChange={(event) =>
                setDraft({ ...draft, url: event.target.value })
              }
            />
          </label>
          <label>
            Intervalo em segundos
            <input
              className={input}
              name="interval"
              type="number"
              required
              min={60}
              max={86400}
              step="any"
              value={draft.interval}
              onChange={(event) =>
                setDraft({ ...draft, interval: event.target.value })
              }
            />
          </label>
          <label>
            Timeout em segundos
            <input
              className={input}
              name="timeout"
              type="number"
              required
              min={1}
              max={30}
              step="any"
              value={draft.timeout}
              onChange={(event) =>
                setDraft({ ...draft, timeout: event.target.value })
              }
            />
          </label>
          <div className="flex gap-3 sm:col-span-2">
            <button
              type="submit"
              className="rounded-lg bg-emerald-400 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
            >
              {pending ? "Salvando…" : "Salvar alterações"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-600 px-4 py-2"
            >
              {state.success ? "Fechar edição" : "Cancelar"}
            </button>
          </div>
        </fieldset>
        <p
          aria-live="polite"
          className={`mt-3 text-sm ${state.success ? "text-emerald-300" : "text-red-300"}`}
        >
          {state.message}
        </p>
      </form>
    </section>
  );
}
export default function MonitorEdit({ monitor }: { monitor: Monitor }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <Editor monitor={monitor} onClose={() => setOpen(false)} />
  ) : (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="mt-4 rounded-lg border border-slate-600 px-3 py-2 text-sm"
    >
      Editar monitor
    </button>
  );
}
