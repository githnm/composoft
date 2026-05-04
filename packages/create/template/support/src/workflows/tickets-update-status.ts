import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketStatus = z.enum(["new", "open", "pending", "resolved", "closed"]);

export const ticketsUpdateStatus = defineWorkflow({
  id: "tickets.update-status",
  version: "0.1.0",
  description:
    "Transition a ticket's status. Setting `resolved` or `closed` stamps `resolvedAt`; reopening clears it.",
  input: z.object({
    ticketId: z.string(),
    status: ticketStatus,
    notes: z.string().optional(),
  }),
  output: z.object({
    ticketId: z.string(),
    status: ticketStatus,
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ ticketId, status, notes }, context) => {
    const updated = db.tickets.setStatus(ticketId, status);
    db.audit.log({
      ticketId,
      actorId: context.user.id,
      action: "tickets.update-status",
      detail: notes ? `→ ${status} (${notes})` : `→ ${status}`,
    });
    return { ticketId: updated.id, status: updated.status };
  },
});
