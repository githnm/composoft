"use client";

import { useState } from "react";
import type { z } from "zod";
import type { BlockProps, WorkflowActionWithPrefilled } from "@composoft/spec";
import type { assignAgent } from "../workflows/tickets-assign-agent.js";
import type { escalateTicket } from "../workflows/tickets-escalate.js";
import type { configSchema } from "./agent-handoff-panel.js";

type Config = z.infer<typeof configSchema>;
type Data = Record<string, never>;
type Actions = {
  assign: WorkflowActionWithPrefilled<typeof assignAgent, "ticketId">;
  escalate: WorkflowActionWithPrefilled<typeof escalateTicket, "ticketId">;
};

export function AgentHandoffPanel({ actions, config }: BlockProps<Config, Data, Actions>) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    config.agents[0]?.id ?? null,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"assign" | "escalate" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const visibleAgents = config.showSeniorQueueOnly
    ? config.agents.filter((a) => a.isSenior)
    : config.agents;

  const onAssign = async () => {
    if (!selectedAgentId) return;
    setBusy("assign");
    setFeedback(null);
    try {
      const result = await actions.assign({ agentId: selectedAgentId });
      setFeedback(`Assigned to ${result.assignedTo}.`);
    } finally {
      setBusy(null);
    }
  };

  const onEscalate = async () => {
    if (!reason.trim()) {
      setFeedback("Reason is required to escalate.");
      return;
    }
    setBusy("escalate");
    setFeedback(null);
    try {
      const result = await actions.escalate({ reason: reason.trim() });
      setFeedback(`Escalated. Audit ${result.auditEntryId}.`);
      setReason("");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="flex w-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <h2 className="text-sm font-semibold text-slate-900">Hand off ticket</h2>
        <p className="text-xs text-slate-500">
          {config.showSeniorQueueOnly
            ? "Senior queue only"
            : `${visibleAgents.length} agent${visibleAgents.length === 1 ? "" : "s"} available`}
        </p>
      </header>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Assign to agent</label>
        <select
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          value={selectedAgentId ?? ""}
          onChange={(e) => setSelectedAgentId(e.target.value || null)}
        >
          {visibleAgents.length === 0 && <option value="">No eligible agents</option>}
          {visibleAgents.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
              {a.isSenior ? " · senior" : ""}
            </option>
          ))}
        </select>
        <button
          className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          disabled={!selectedAgentId || busy !== null}
          onClick={onAssign}
        >
          {busy === "assign" ? "Assigning…" : "Assign"}
        </button>
      </div>

      <hr className="border-slate-200" />

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-slate-500">Or escalate</label>
        <textarea
          className="mt-1 w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
          rows={3}
          placeholder="Reason for escalation"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          className="mt-2 rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
          disabled={busy !== null}
          onClick={onEscalate}
        >
          {busy === "escalate" ? "Escalating…" : "Escalate to senior queue"}
        </button>
      </div>

      {feedback && <p className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-700">{feedback}</p>}
    </section>
  );
}
