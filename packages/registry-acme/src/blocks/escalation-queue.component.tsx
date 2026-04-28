"use client";

import { useMemo } from "react";
import type { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { listTickets } from "../adapters/tickets-list.js";
import type { assignAgent } from "../workflows/tickets-assign-agent.js";
import type { configSchema } from "./escalation-queue.js";

type Config = z.infer<typeof configSchema>;
type Data = { tickets: AdapterOutput<typeof listTickets> };
type Actions = { assign: WorkflowAction<typeof assignAgent> };

const PRIORITY_RANK: Record<Data["tickets"][number]["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function EscalationQueue({ data, actions, config }: BlockProps<Config, Data, Actions>) {
  const sorted = useMemo(() => {
    const list = [...data.tickets];
    if (config.sortBy === "priority") {
      list.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
    } else {
      list.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
    }
    return list.slice(0, config.pageSize);
  }, [data.tickets, config.sortBy, config.pageSize]);

  return (
    <section className="overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-red-900">Escalation queue</h2>
          <p className="text-xs text-red-700">
            {data.tickets.length} escalated · sorted by{" "}
            {config.sortBy === "priority" ? "priority" : "last activity"}
          </p>
        </div>
      </header>
      {sorted.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Nothing in the senior queue right now.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {sorted.map((t) => (
            <li
              key={t.id}
              className="flex items-start justify-between gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    {t.priority}
                  </span>
                  <span className="truncate text-sm font-medium text-slate-900">{t.subject}</span>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t.customerName}
                  {t.customerVip ? " · VIP" : ""} · {new Date(t.lastActivityAt).toLocaleString()}
                </p>
              </div>
              <button
                className="shrink-0 rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                onClick={async () => {
                  const agentId = window.prompt("Senior agent id?");
                  if (!agentId) return;
                  await actions.assign({ ticketId: t.id, agentId });
                }}
              >
                Assign
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
