import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketPriority = z.enum(["low", "medium", "high", "urgent"]);

export const ticketsUpdatePriority = defineWorkflow({
  id: "tickets.update-priority",
  version: "0.1.0",
  description: "Change a ticket's priority level.",
  input: z.object({
    ticketId: z.string(),
    priority: ticketPriority,
  }),
  output: z.object({
    ticketId: z.string(),
    priority: ticketPriority,
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ ticketId, priority }, context) => {
    const updated = db.tickets.setPriority(ticketId, priority);
    db.audit.log({
      ticketId,
      actorId: context.user.id,
      action: "tickets.update-priority",
      detail: `→ ${priority}`,
    });
    return { ticketId: updated.id, priority: updated.priority };
  },
});
