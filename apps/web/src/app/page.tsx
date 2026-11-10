import { Suspense } from "react";
import MonitorCard from "@/components/MonitorCard";
import MonitorForm from "@/components/MonitorForm";
import Refresh from "@/components/Refresh";
import { getMonitors, type Monitor } from "@/lib/monitors";

async function MonitorList() {
  let monitors: Monitor[];
  try {
    monitors = await getMonitors();
  } catch {
    return (
      <p
        role="alert"
        className="mt-6 rounded-xl border border-red-900 p-6 text-red-300"
      >
        Não foi possível carregar os monitores. Confira se a API está disponível
        e tente atualizar.
      </p>
    );
  }
  const enabled = monitors.filter((monitor) => monitor.enabled);
  const online = enabled.filter(
    (monitor) => monitor.checks[0]?.status === "ONLINE",
  ).length;
  const pending = enabled.filter((monitor) => !monitor.checks.length).length;
  const metrics = [
    ["Monitores", monitors.length],
    ["Habilitados", enabled.length],
    ["Online", online],
    ["Com falha", enabled.length - online - pending],
    ["Pendentes", pending],
  ];
  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {metrics.map(([label, value]) => (
          <div
            key={label}
            className="rounded-xl border border-slate-800 bg-slate-900 p-4"
          >
            <p className="text-sm text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-bold">{value}</p>
          </div>
        ))}
      </div>
      {monitors.length === 0 ? (
        <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
          <p className="text-slate-400">Nenhum monitor cadastrado.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {monitors.map((monitor) => (
            <MonitorCard key={monitor.id} monitor={monitor} />
          ))}
        </div>
      )}
    </>
  );
}
export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto max-w-5xl">
        <header>
          <h1 className="text-4xl font-bold tracking-tight">Watchtower</h1>
          <p className="mt-3 text-slate-400">
            Monitore a disponibilidade das suas aplicações e APIs.
          </p>
        </header>
        <MonitorForm />
        <section className="mt-12" aria-labelledby="monitors-heading">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 id="monitors-heading" className="text-2xl font-semibold">
              Meus monitores
            </h2>
            <Refresh />
          </div>
          <p className="mt-2 text-sm text-slate-400">
            Atualização a cada 15 segundos. Horários de Brasília. Abra um
            monitor para consultar seu histórico.
          </p>
          <Suspense
            fallback={
              <p className="mt-6 text-slate-400">Carregando monitores…</p>
            }
          >
            <MonitorList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
