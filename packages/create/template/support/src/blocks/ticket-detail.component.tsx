"use client";

import { useState } from "react";
import type { Props } from "./ticket-detail-types.js";

const STATUS_DOT: Record<string, string> = {
  new:      "bg-blue-500",
  open:     "bg-amber-500",
  pending:  "bg-slate-400",
  resolved: "bg-emerald-500",
  closed:   "bg-slate-300",
};

const PRIORITY_BADGE: Record<string, string> = {
  low:    "bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  medium: "bg-slate-50 text-slate-700 dark:bg-slate-900/50 dark:text-slate-300",
  high:   "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400",
  urgent: "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400",
};

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").charAt(0).toUpperCase();
  return ((parts[0] ?? "").charAt(0) + (parts[parts.length - 1] ?? "").charAt(0)).toUpperCase();
}

function Avatar({ name, fromAgent }: { name: string; fromAgent: boolean }) {
  // Agents render with the primary fill (active speaker on this team's
  // side). Requesters get a muted neutral fill so the thread reads at a
  // glance — same convention Linear / Pylon use for inbound vs outbound.
  const cls = fromAgent
    ? "bg-primary text-primary-foreground"
    : "bg-muted text-muted-foreground";
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${cls}`}>
      {initialsOf(name)}
    </div>
  );
}

export function TicketDetailView({ data, actions, config }: Props) {
  const [reply, setReply] = useState("");
  const [showMacros, setShowMacros] = useState(false);
  const [busy, setBusy] = useState(false);
  const ticket = data.ticket;
  const conv = data.conversation;

  if (!ticket) {
    return (
      <section>
        <p className="py-12 text-center text-sm text-muted-foreground">
          Select a ticket from the inbox to see details.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <header className="space-y-2">
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
          {ticket.accountName}
        </span>
        <h2
          className="text-xl font-semibold leading-tight text-foreground"
          style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
        >
          {ticket.subject}
        </h2>
        <p className="text-xs text-muted-foreground">#{ticket.id} · {ticket.channel}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[ticket.status] ?? "bg-slate-400"}`} />
            <span className="text-foreground">{ticket.status}</span>
          </span>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PRIORITY_BADGE[ticket.priority] ?? ""}`}>
            {ticket.priority}
          </span>
          {ticket.assigneeId ? (
            <span className="inline-flex rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
              assigned: {ticket.assigneeId}
            </span>
          ) : null}
        </div>
      </header>

      {/* Action buttons: subtle, grouped above the composer. Status-only
          actions live here; the rich-input actions (escalate, assign with
          target, send-reply) need their own UI below. */}
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        <button
          type="button"
          disabled={busy || ticket.status === "resolved"}
          onClick={async () => {
            setBusy(true);
            try {
              await actions.updateStatus({ status: "resolved" });
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Mark resolved
        </button>
        <button
          type="button"
          disabled={busy || ticket.status === "pending"}
          onClick={async () => {
            setBusy(true);
            try {
              await actions.updateStatus({ status: "pending" });
            } finally {
              setBusy(false);
            }
          }}
          className="inline-flex items-center rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          Mark pending
        </button>
      </div>

      {/* Conversation thread. Each message is a card-like container with
          a colored left border — accent for agent replies, neutral for
          requester. Avatar circle on the left, body text in the body. */}
      {conv && conv.messages.length > 0 ? (
        <div className="space-y-3">
          {conv.messages.map((m) => (
            <div
              key={m.id}
              className={
                "flex gap-3 rounded-lg border border-l-4 bg-card p-3 " +
                (m.fromAgent
                  ? "border-border border-l-primary"
                  : "border-border border-l-muted-foreground/40")
              }
            >
              <Avatar name={m.fromName} fromAgent={m.fromAgent} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 flex items-center gap-2 text-xs">
                  <span className="font-medium text-foreground">{m.fromName}</span>
                  <span className="text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</span>
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{m.body}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* Composer. Macro picker is a dropdown above the textarea; clicking
          a macro fills the textarea and closes the dropdown. The textarea
          itself uses the shadcn input ring tokens so theme overrides work. */}
      <div className="space-y-2 border-t border-border pt-4">
        {config.showMacros && data.macros.length > 0 ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMacros((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
            >
              <span>Macros</span>
              <svg viewBox="0 0 12 12" className="h-3 w-3 fill-current">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showMacros ? (
              <div className="absolute left-0 top-full z-10 mt-1 max-h-64 w-72 overflow-auto rounded-md border border-border bg-popover p-1 shadow-md">
                {data.macros.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setReply(m.body);
                      setShowMacros(false);
                    }}
                    className="block w-full rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted"
                  >
                    <span className="block font-medium text-foreground">{m.title}</span>
                    <span className="line-clamp-1 text-muted-foreground">{m.body}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply…"
          rows={4}
          className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/20"
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            disabled={busy || reply.trim() === ""}
            onClick={async () => {
              setBusy(true);
              try {
                await actions.reply({ body: reply });
                setReply("");
              } finally {
                setBusy(false);
              }
            }}
            className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send reply"}
          </button>
        </div>
      </div>
    </section>
  );
}
