"use client";

import { useState } from "react";
import type { Props } from "./ticket-queue-types.js";

const STATUS_STYLE: Record<string, string> = {
  new:      "bg-blue-50 text-blue-700 ring-blue-200",
  open:     "bg-amber-50 text-amber-700 ring-amber-200",
  pending:  "bg-slate-100 text-slate-600 ring-slate-200",
  resolved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed:   "bg-slate-100 text-slate-500 ring-slate-200",
};

const PRIORITY_STYLE: Record<string, string> = {
  low:    "text-slate-500",
  medium: "text-slate-700",
  high:   "text-amber-700",
  urgent: "text-rose-600 font-semibold",
};

const CHANNEL_LABEL: Record<string, string> = {
  email: "✉",
  slack: "#",
  web:   "◉",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function slaBadge(due: string, status: string): { label: string; className: string } | null {
  if (status === "resolved" || status === "closed") return null;
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { label: "SLA breached", className: "text-rose-600 font-medium" };
  const h = ms / 3600_000;
  if (h < 4) return { label: `SLA ${Math.round(h)}h`, className: "text-amber-600" };
  return null;
}

export function TicketQueueView({ data, writes }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = data.tickets.rows;
  return (
    <section>
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Inbox</h2>
          <p className="text-xs text-slate-500">{rows.length} of {data.tickets.total} tickets</p>
        </div>
      </header>
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">Inbox is empty.</p>
      ) : (
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="pb-2 pr-3 font-medium">Subject</th>
              <th className="pb-2 pr-3 font-medium">Account</th>
              <th className="pb-2 pr-3 font-medium">Status</th>
              <th className="pb-2 pr-3 font-medium">Priority</th>
              <th className="pb-2 pr-3 font-medium">Channel</th>
              <th className="pb-2 pr-3 font-medium">SLA / age</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((t) => {
              const sla = slaBadge(t.slaDueAt, t.status);
              const isSelected = selectedId === t.id;
              return (
                <tr
                  key={t.id}
                  onClick={() => {
                    setSelectedId(t.id);
                    writes.selectTicket({ ticketId: t.id });
                  }}
                  className={`cursor-pointer ${isSelected ? "bg-blue-50/40" : "hover:bg-slate-50"}`}
                >
                  <td className="py-2 pr-3 font-medium text-slate-900">{t.subject}</td>
                  <td className="py-2 pr-3 text-slate-700">{t.accountName}</td>
                  <td className="py-2 pr-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[t.status] ?? ""}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className={`py-2 pr-3 text-xs ${PRIORITY_STYLE[t.priority] ?? ""}`}>{t.priority}</td>
                  <td className="py-2 pr-3 text-slate-500">{CHANNEL_LABEL[t.channel] ?? t.channel}</td>
                  <td className="py-2 pr-3 text-xs">
                    {sla ? <span className={sla.className}>{sla.label}</span> : <span className="text-slate-500">{formatRelative(t.updatedAt)} ago</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
