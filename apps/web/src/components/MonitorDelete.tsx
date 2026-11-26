"use client";
import { useActionState, useState } from "react";
import { deleteMonitor } from "@/app/actions";

function Confirmation({
  id,
  name,
  onCancel,
}: {
  id: string;
  name: string;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState(
    deleteMonitor.bind(null, id),
    { message: "", success: false },
  );
  return (
    <form action={action} className="mt-4">
      <p id="delete-warning" className="text-sm text-slate-300">
        Deseja excluir permanentemente{" "}
        <strong className="break-words">{name}</strong>? O monitor e todo o
        histórico de verificações serão apagados. Essa ação não pode ser
        desfeita.
      </p>
      <input type="hidden" name="confirmation" value={id} />
      <fieldset
        disabled={pending}
        aria-describedby="delete-warning"
        className="mt-4 flex flex-wrap gap-3"
      >
        <legend className="sr-only">Confirmação de exclusão</legend>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-600 px-4 py-2 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Excluindo…" : "Confirmar exclusão"}
        </button>
      </fieldset>
      <p aria-live="polite" className="mt-3 text-sm text-red-300">
        {state.message}
      </p>
    </form>
  );
}

export default function MonitorDelete({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <section
      aria-labelledby="delete-heading"
      className="mt-10 rounded-xl border border-red-900 p-6"
    >
      <h2 id="delete-heading" className="text-lg font-semibold">
        Excluir monitor
      </h2>
      {confirming ? (
        <Confirmation
          id={id}
          name={name}
          onCancel={() => setConfirming(false)}
        />
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-400">
            Remove este monitor e seu histórico de verificações.
          </p>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="mt-4 rounded-lg border border-red-800 px-4 py-2 text-red-300"
          >
            Excluir monitor
          </button>
        </>
      )}
    </section>
  );
}
