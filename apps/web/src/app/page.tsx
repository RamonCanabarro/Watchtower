import { Suspense } from "react";
import MonitorCard from "@/components/MonitorCard";
import { getMonitors, type Monitor } from "@/lib/monitors";

async function MonitorList() {
  let monitors: Monitor[];

  try {
    monitors = await getMonitors();
  } catch {
    return (
      <p className="mt-6 rounded-xl border border-red-900 p-6 text-red-300">
        Não foi possível carregar os monitores. Tente novamente em instantes.
      </p>
    );
  }

  if (monitors.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-slate-700 p-8 text-center">
        <p className="text-slate-400">Nenhum monitor cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      {monitors.map((monitor) => (
        <MonitorCard
          key={monitor.id}
          name={monitor.name}
          url={monitor.url}
          enabled={monitor.enabled}
        />
      ))}
    </div>
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

        <section className="mt-12" aria-labelledby="monitors-heading">
          <h2 id="monitors-heading" className="text-2xl font-semibold">
            Meus monitores
          </h2>

          <Suspense
            fallback={<p className="mt-6 text-slate-400">Carregando monitores…</p>}
          >
            <MonitorList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}