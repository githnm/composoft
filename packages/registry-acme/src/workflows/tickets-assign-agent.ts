import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const assignAgent = defineWorkflow({
  id: "tickets.assign-agent",
  version: "0.1.0",
  description: "Assign a ticket to a specific agent.",
  input: z.object({
    ticketId: z.string(),
    agentId: z.string(),
  }),
  output: z.object({
    ticketId: z.string(),
    assignedTo: z.string(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ ticketId, agentId }) => {
    const updated = db.tickets.update(ticketId, { assignedTo: agentId });
    return {
      ticketId: updated.id,
      assignedTo: agentId,
    };
  },
});
