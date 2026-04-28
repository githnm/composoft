"use client";

import { useMemo, useState } from "react";
import type { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { listTickets } from "../adapters/tickets-list.js";
import type { escalateTicket } from "../workflows/tickets-escalate.js";
import type { assignAgent } from "../workflows/tickets-assign-agent.js";
import type { configSchema } from "./ticket-list.js";

type Config = z.infer<typeof configSchema>;
type Data = { tickets: AdapterOutput<typeof listTickets> };
type Actions = {
  escalate: WorkflowAction<typeof escalateTicket>;
  assign: WorkflowAction<typeof assignAgent>;
};
type Column = Config["columns"][number];

const COLUMN_LABEL: Record<Column, string> = {
  subject: "Subject",
  customer: "Customer",
  status: "Status",
  priority: "Priority",
  lastActivity: "Last activity",
  vipFlag: "VIP",
};

const STATUS_BADGE: Record<Data["tickets"][number]["status"], string> = {
  open: "bg-emerald-100 text-emerald-800",
  pending: "bg-amber-100 text-amber-800",
  closed: "bg-slate-100 text-slate-600",
};

const PRIORITY_BADGE: Record<Data["tickets"][number]["priority"], string> = {
  low: "bg-slate-100 text-slate-600",
  normal: "bg-sky-100 text-sky-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

export function TicketListView({ data, actions, config }: BlockProps<Config, Data, Actions>) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(data.tickets.length / config.pageSize));
  const visible = useMemo(() => {
    const start = page * config.pageSize;
    return data.tickets.slice(start, start + config.pageSize);
  }, [data.tickets, page, config.pageSize]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Tickets</h2>
          <p className="text-xs text-slate-500">
            {data.tickets.length} matching · page {page + 1} of {pageCount}
          </p>
        </div>
      </header>
      <table className="w-full text-sm">
        <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {config.columns.map((col) => (
              <th key={col} className="border-b border-slate-200 px-4 py-2 font-medium">
                {COLUMN_LABEL[col]}
              </th>
            ))}
            <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-500">
                No tickets match this view.
              </td>
            </tr>
          ) : (
            visible.map((t) => (
              <tr key={t.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {config.columns.map((col) => (
                  <td key={col} className="px-4 py-2 align-top text-slate-700">
                    {col === "subject" && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{t.subject}</span>
                        {t.escalated && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                            Escalated
                          </span>
                        )}
                      </div>
                    )}
                    {col === "customer" && t.customerName}
                    {col === "status" && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[t.status]}`}>
                        {t.status}
                      </span>
                    )}
                    {col === "priority" && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_BADGE[t.priority]}`}>
                        {t.priority}
                      </span>
                    )}
                    {col === "lastActivity" && (
                      <time className="text-xs text-slate-500" dateTime={t.lastActivityAt}>
                        {new Date(t.lastActivityAt).toLocaleString()}
                      </time>
                    )}
                    {col === "vipFlag" &&
                      (t.customerVip ? (
                        <span className="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-purple-800">
                          VIP
                        </span>
                      ) : null)}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  <div className="inline-flex gap-2">
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={async () => {
                        const reason = window.prompt("Reason for escalation?");
                        if (!reason) return;
                        await actions.escalate({ ticketId: t.id, reason });
                      }}
                    >
                      Escalate
                    </button>
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={async () => {
                        const agentId = window.prompt("Agent id?");
                        if (!agentId) return;
                        await actions.assign({ ticketId: t.id, agentId });
                      }}
                    >
                      Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
        <button
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </button>
        <button
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          Next
        </button>
      </footer>
    </section>
  );
}
