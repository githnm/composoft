import type { Props } from "./kpi-row-types.js";

export function KpiRowView({ data }: Props) {
  const m = data.metrics;
  const cells = [
    { label: "Open",            value: m.openCount.toString(),                  hint: "tickets in new + open" },
    { label: "New today",       value: m.newToday.toString(),                   hint: "in the last 24 hours" },
    { label: "SLA at risk",     value: m.slaAtRisk.toString(),                  hint: "due in <4h, unresolved", emphasis: m.slaAtRisk > 0 },
    { label: "Avg resolution",  value: `${m.avgResolutionHours.toFixed(1)}h`,   hint: "across resolved tickets" },
  ];
  return (
    <section>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {cells.map((c) => (
          <div key={c.label} className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-slate-500">{c.label}</p>
            <p className={`text-2xl font-semibold ${c.emphasis ? "text-rose-600" : "text-slate-900"}`}>{c.value}</p>
            <p className="text-xs text-slate-500">{c.hint}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
