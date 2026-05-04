import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketPriority = z.enum(["low", "medium", "high", "urgent"]);

export const ticketsEscalate = defineWorkflow({
  id: "tickets.escalate",
  version: "0.1.0",
  description:
    "Bump priority to high+ and reassign to an engineer. Writes an audit entry tagged 'escalated to engineering'.",
  input: z.object({
    ticketId: z.string(),
    engineerId: z.string(),
    reason: z.string().min(1),
  }),
  output: z.object({
    ticketId: z.string(),
    assigneeId: z.string(),
    priority: ticketPriority,
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ ticketId, engineerId, reason }, context) => {
    // If priority isn't already high or urgent, bump it. Otherwise leave it.
    const ticket = db.tickets.byId(ticketId);
    const targetPriority: z.infer<typeof ticketPriority> =
      ticket && (ticket.priority === "high" || ticket.priority === "urgent")
        ? ticket.priority
        : "high";
    db.tickets.setPriority(ticketId, targetPriority);
    db.tickets.setAssignee(ticketId, engineerId);
    db.audit.log({
      ticketId,
      actorId: context.user.id,
      action: "tickets.escalate",
      detail: `escalated to engineering (${engineerId}): ${reason}`,
    });
    return { ticketId, assigneeId: engineerId, priority: targetPriority };
  },
});
