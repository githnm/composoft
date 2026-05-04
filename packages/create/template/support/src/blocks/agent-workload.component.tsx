"use client";

import type { Props } from "./agent-workload-types.js";

// Workload ceiling for the bar visualization. Open-count above this fills
// the bar entirely + colors red. Below, the bar fills proportionally and
// stays primary-tinted. Picked at 8 because the seed data tops out around
// 5–6 per active agent — keep this in line with realistic workloads.
const WORKLOAD_CEILING = 8;

const ROLE_BADGE: Record<string, string> = {
  agent:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  lead:     "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  engineer: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").charAt(0).toUpperCase();
  return ((parts[0] ?? "").charAt(0) + (parts[parts.length - 1] ?? "").charAt(0)).toUpperCase();
}

export function AgentWorkloadView({ data }: Props) {
  const sorted = [...data.agents].sort((a, b) => b.openTicketCount - a.openTicketCount);
  return (
    <section>
      <header className="mb-3">
        <h2 className="text-base font-semibold text-foreground">Workload</h2>
        <p className="text-xs text-muted-foreground">Open tickets per agent</p>
      </header>
      <ul className="space-y-2">
        {sorted.map((a) => {
          const overload = a.openTicketCount >= WORKLOAD_CEILING;
          const fill = Math.min(100, (a.openTicketCount / WORKLOAD_CEILING) * 100);
          const roleClass = ROLE_BADGE[a.role] ?? ROLE_BADGE.agent ?? "bg-muted";
          return (
            <li key={a.id} className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
                {initialsOf(a.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{a.name}</span>
                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium capitalize ${roleClass}`}>
                    {a.role}
                  </span>
                </div>
                {/* Workload bar. Fills proportionally up to WORKLOAD_CEILING.
                    Goes red when at-or-over capacity so a lead can spot
                    overload at a glance without reading the count. */}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full transition-all ${overload ? "bg-red-500" : "bg-primary"}`}
                    style={{ width: `${fill}%` }}
                  />
                </div>
              </div>
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-xs tabular-nums " +
                  (overload
                    ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                    : "bg-muted text-muted-foreground")
                }
              >
                {a.openTicketCount}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
