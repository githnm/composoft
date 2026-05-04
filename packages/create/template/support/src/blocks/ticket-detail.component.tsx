"use client";

import { useState } from "react";
import type { Props } from "./ticket-detail-types.js";

export function TicketDetailView({ data, actions, config }: Props) {
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const ticket = data.ticket;
  const conv = data.conversation;

  if (!ticket) {
    return (
      <section>
        <p className="py-6 text-center text-sm text-slate-500">
          Select a ticket from the inbox to see details.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{ticket.subject}</h2>
        <p className="text-xs text-slate-500">
          {ticket.accountName} · #{ticket.id} · {ticket.channel}
        </p>
        <div className="flex flex-wrap gap-2 pt-1 text-xs">
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{ticket.status}</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">priority: {ticket.priority}</span>
          {ticket.assigneeId ? (
            <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">assigned: {ticket.assigneeId}</span>
          ) : null}
        </div>
      </header>

      {conv && conv.messages.length > 0 ? (
        <div className="space-y-2">
          {conv.messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-md border p-3 text-sm ${m.fromAgent ? "border-blue-100 bg-blue-50/50" : "border-slate-200 bg-white"}`}
            >
              <p className="mb-1 text-xs text-slate-500">
                <span className="font-medium text-slate-700">{m.fromName}</span>{" · "}
                {new Date(m.createdAt).toLocaleString()}
              </p>
              <p className="text-slate-800">{m.body}</p>
            </div>
          ))}
        </div>
      ) : null}

      <div className="space-y-2 border-t border-slate-200 pt-3">
        {config.showMacros && data.macros.length > 0 ? (
          <div className="flex flex-wrap gap-1 text-xs">
            {data.macros.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setReply(m.body)}
                className="rounded border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-100"
              >
                {m.title}
              </button>
            ))}
          </div>
        ) : null}
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply…"
          rows={4}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
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
            className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          >
            {busy ? "Sending…" : "Send reply"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await actions.updateStatus({ status: "resolved" });
              } finally {
                setBusy(false);
              }
            }}
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
          >
            Mark resolved
          </button>
        </div>
      </div>
    </section>
  );
}
