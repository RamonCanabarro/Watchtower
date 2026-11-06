type MonitorCardProps = {
  name: string;
  url: string;
  enabled: boolean;
};

export default function MonitorCard({
  name,
  url,
  enabled,
}: MonitorCardProps) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h3 className="text-lg font-semibold text-slate-100">
        {name}
      </h3>

      <p className="mt-2 break-words text-sm text-slate-400">
        {url}
      </p>

      <span
        className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-medium ${
          enabled
            ? "bg-emerald-950 text-emerald-300"
            : "bg-slate-800 text-slate-400"
        }`}
      >
        {enabled ? "Habilitado" : "Desabilitado"}
      </span>
    </article>
  );
}