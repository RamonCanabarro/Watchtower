import { Suspense } from "react";
import Link from "next/link";
import MonitorToggle from "@/components/MonitorToggle";
import Refresh from "@/components/Refresh";
import {
  apiRequest,
  formatDate,
  statusLabels,
  type Check,
  type Summary,
} from "@/lib/monitors";

async function MonitorDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id))
    return <p className="mt-6">Identificador de monitor inválido.</p>;
  let summary: Summary;
  let history: Check[];
  try {
    [summary, history] = await Promise.all([
      apiRequest<Summary>(`/monitors/${id}/summary`),
      apiRequest<Check[]>(`/monitors/${id}/checks?limit=50`),
    ]);
  } catch {
    return (
      <p
        role="alert"
        className="mt-6 rounded-xl border border-red-900 p-6 text-red-300"
      >
        Não foi possível carregar este monitor. Confira se ele existe e se a API
        está disponível.
      </p>
    );
  }
  const { monitor } = summary;
  return (
    <>
      <h1 className="mt-8 text-3xl font-bold">{monitor.name}</h1>
      <p className="mt-3 break-words text-slate-400">{monitor.url}</p>
      <p className="mt-2 text-sm text-slate-400">
        Intervalo {monitor.interval} s · Timeout {monitor.timeout} s ·{" "}
        {monitor.enabled ? "Habilitado" : "Pausado"}
      </p>
      <MonitorToggle id={id} enabled={monitor.enabled} />
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Sucesso nas últimas 24 h",
            summary.uptime === null
              ? "Sem dados"
              : `${summary.uptime.toFixed(2)}%`,
          ],
          ["Verificações nas últimas 24 h", String(summary.total)],
          [
            "Resposta média com sucesso",
            summary.averageResponseTime === null
              ? "Sem dados"
              : `${Math.round(summary.averageResponseTime)} ms`,
          ],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-5"
          >
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-3 text-2xl font-semibold">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm text-slate-400">
        Disponibilidade estimada pela proporção de verificações com sucesso.
        Tempos medidos até receber os cabeçalhos HTTP. Horários de Brasília.
      </p>
      <h2 className="mt-10 text-xl font-semibold">Últimas 50 verificações</h2>
      {history.length === 0 ? (
        <p className="mt-4 text-slate-400">
          Aguardando a primeira verificação. Confira se o worker está em
          execução.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Histórico de verificações HTTP
            </caption>
            <thead className="text-slate-400">
              <tr>
                {["Horário", "Resultado", "HTTP", "Resposta", "Detalhes"].map(
                  (title) => (
                    <th
                      key={title}
                      scope="col"
                      className="border-b border-slate-700 px-3 py-3"
                    >
                      {title}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {history.map((check) => (
                <tr key={check.id} className="border-b border-slate-800">
                  <td className="whitespace-nowrap px-3 py-3">
                    <time dateTime={check.checkedAt}>
                      {formatDate(check.checkedAt)}
                    </time>
                  </td>
                  <td
                    className={`px-3 py-3 ${check.status === "ONLINE" ? "text-emerald-300" : "text-red-300"}`}
                  >
                    {statusLabels[check.status]}
                  </td>
                  <td className="px-3 py-3">{check.httpStatus ?? "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {check.responseTime} ms
                  </td>
                  <td className="px-3 py-3">{check.error ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
export default function DetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link href="/" className="text-emerald-300 underline">
            Voltar aos monitores
          </Link>
          <Refresh />
        </div>
        <Suspense fallback={<p className="mt-6">Carregando histórico…</p>}>
          <MonitorDetail params={params} />
        </Suspense>
      </div>
    </main>
  );
}
