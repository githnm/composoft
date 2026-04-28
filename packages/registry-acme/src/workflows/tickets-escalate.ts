import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const escalateTicket = defineWorkflow({
  id: "tickets.escalate",
  version: "0.1.0",
  description: "Mark a ticket escalated, route to the senior queue, and write an audit entry.",
  input: z.object({
    ticketId: z.string(),
    reason: z.string().min(1),
  }),
  output: z.object({
    ticketId: z.string(),
    escalated: z.literal(true),
    assignedTo: z.string(),
    auditEntryId: z.string(),
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ ticketId, reason }) => {
    const updated = db.tickets.update(ticketId, {
      escalated: true,
      assignedTo: "queue:senior",
    });
    const audit = db.auditLog.write({
      action: "tickets.escalate",
      ticketId: updated.id,
      actor: "agent",
      reason,
      at: new Date().toISOString(),
    });
    return {
      ticketId: updated.id,
      escalated: true as const,
      assignedTo: "queue:senior",
      auditEntryId: audit.id,
    };
  },
});
