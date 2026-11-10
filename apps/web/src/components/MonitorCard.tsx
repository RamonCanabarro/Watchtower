import Link from "next/link";
import { formatDate, statusLabels, type Monitor } from "@/lib/monitors";

export default function MonitorCard({ monitor }: { monitor: Monitor }) {
  const check = monitor.checks[0];
  const statusColor =
    check?.status === "ONLINE"
      ? "text-emerald-300"
      : check
        ? "text-red-300"
        : "text-slate-400";
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-lg font-semibold">
        <Link
          className="underline decoration-slate-600 underline-offset-4"
          href={`/monitors/${monitor.id}`}
        >
          {monitor.name}
        </Link>
      </h3>
      <p className="mt-2 break-words text-sm text-slate-400">{monitor.url}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-slate-800 px-3 py-1">
          {monitor.enabled ? "Habilitado" : "Pausado"}
        </span>
        <span className={statusColor}>
          {check ? statusLabels[check.status] : "Verificação pendente"}
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-400">
        {check
          ? `${check.responseTime} ms · ${formatDate(check.checkedAt)}`
          : "Aguardando a primeira execução do worker."}
      </p>
    </article>
  );
}
