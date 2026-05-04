"use client";

import { useState } from "react";
import type { Props } from "./ticket-queue-types.js";

// Status dot — colored pill on the left of the status label. Maps each
// status to a token-aligned background; downstream theme overrides via
// shadcn's CSS vars don't touch the saturated semantic palette so these
// stay readable in light + dark.
const STATUS_DOT: Record<string, string> = {
  new:      "bg-blue-500",
  open:     "bg-amber-500",
  pending:  "bg-slate-400",
  resolved: "bg-emerald-500",
  closed:   "bg-slate-300",
};

// Priority emphasis. Urgent + high get bold + saturated text; medium +
// low stay neutral. Reads on both light and dark backgrounds.
const PRIORITY_STYLE: Record<string, string> = {
  low:    "text-muted-foreground",
  medium: "text-foreground",
  high:   "font-semibold text-amber-700 dark:text-amber-400",
  urgent: "font-semibold text-red-600 dark:text-red-400",
};

// Channel marker. Three colored dots — keeps the queue scannable when
// multiple channels overlap on a single account. SVG (not text glyph)
// so the rendering stays consistent across OS font stacks.
const CHANNEL_COLOR: Record<string, string> = {
  email: "fill-slate-400",
  slack: "fill-violet-500",
  web:   "fill-blue-500",
};

function ChannelDot({ channel }: { channel: string }) {
  const cls = CHANNEL_COLOR[channel] ?? "fill-slate-400";
  return (
    <svg viewBox="0 0 8 8" className="h-2 w-2 shrink-0" aria-label={`channel: ${channel}`}>
      <circle cx="4" cy="4" r="3" className={cls} />
    </svg>
  );
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function slaInfo(due: string, status: string): { label: string; tone: "breached" | "risk" | "ok" } | null {
  if (status === "resolved" || status === "closed") return null;
  const ms = new Date(due).getTime() - Date.now();
  if (ms < 0) return { label: "SLA breached", tone: "breached" };
  const h = ms / 3600_000;
  if (h < 4) return { label: `SLA ${Math.round(h)}h`, tone: "risk" };
  return { label: "", tone: "ok" };
}

export function TicketQueueView({ data, writes }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const rows = data.tickets.rows;

  return (
    <section>
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Inbox</h2>
          <p className="text-xs text-muted-foreground">{rows.length} of {data.tickets.total} tickets</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Inbox is empty.</p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="w-1 px-0" aria-hidden />
                <th className="py-2 pl-4 pr-3">Subject</th>
                <th className="py-2 pr-3">Account</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Priority</th>
                <th className="py-2 pr-3">Channel</th>
                <th className="py-2 pr-4">SLA / age</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((t) => {
                const sla = slaInfo(t.slaDueAt, t.status);
                const isSelected = selectedId === t.id;
                const isAtRisk = sla?.tone === "risk" || sla?.tone === "breached";
                return (
                  <tr
                    key={t.id}
                    onClick={() => {
                      setSelectedId(t.id);
                      writes.selectTicket(t.id);
                    }}
                    className={
                      "cursor-pointer transition-colors " +
                      (isSelected ? "bg-accent/40" : "hover:bg-muted/50")
                    }
                  >
                    {/* Left-edge accent bar for the selected row. 4px wide,
                        primary-tinted; renders empty for unselected rows
                        so the grid stays aligned. */}
                    <td
                      className={
                        "w-1 p-0 " +
                        (isSelected ? "bg-primary" : "bg-transparent")
                      }
                      aria-hidden
                    />
                    <td className="py-2.5 pl-4 pr-3 font-medium text-foreground">{t.subject}</td>
                    <td className="py-2.5 pr-3 text-muted-foreground">{t.accountName}</td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[t.status] ?? "bg-slate-400"}`} />
                        <span className="text-foreground">{t.status}</span>
                      </span>
                    </td>
                    <td className={`py-2.5 pr-3 text-xs capitalize ${PRIORITY_STYLE[t.priority] ?? ""}`}>
                      {t.priority}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                        <ChannelDot channel={t.channel} />
                        <span>{t.channel}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-xs">
                      {isAtRisk && sla ? (
                        <span
                          className={
                            sla.tone === "breached"
                              ? "font-medium text-red-600 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-400"
                          }
                        >
                          {sla.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{formatRelative(t.updatedAt)} ago</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
