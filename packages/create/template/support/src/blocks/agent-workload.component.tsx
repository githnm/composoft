import type { Props } from "./agent-workload-types.js";

export function AgentWorkloadView({ data }: Props) {
  const sorted = [...data.agents].sort((a, b) => b.openTicketCount - a.openTicketCount);
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-base font-semibold text-slate-900">Workload</h2>
        <p className="text-xs text-slate-500">Open tickets per agent</p>
      </header>
      <ul className="space-y-2">
        {sorted.map((a) => (
          <li key={a.id} className="flex items-center justify-between text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium text-slate-900">{a.name}</p>
              <p className="truncate text-xs text-slate-500">{a.role}</p>
            </div>
            <span
              className={`ml-3 shrink-0 rounded-full px-2 py-0.5 text-xs ${
                a.openTicketCount > 5
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {a.openTicketCount}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
