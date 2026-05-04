import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const ticketsAssign = defineWorkflow({
  id: "tickets.assign",
  version: "0.1.0",
  description: "Assign a ticket to an agent. Writes an audit log entry.",
  input: z.object({
    ticketId: z.string(),
    agentId: z.string(),
  }),
  output: z.object({
    ticketId: z.string(),
    assigneeId: z.string(),
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ ticketId, agentId }, context) => {
    const updated = db.tickets.setAssignee(ticketId, agentId);
    db.audit.log({
      ticketId,
      actorId: context.user.id,
      action: "tickets.assign",
      detail: `assigned to ${agentId}`,
    });
    return { ticketId: updated.id, assigneeId: agentId };
  },
});
