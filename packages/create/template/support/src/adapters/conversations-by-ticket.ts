import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketChannel = z.enum(["email", "slack", "web"]);
const ticketStatus = z.enum(["new", "open", "pending", "resolved", "closed"]);

export const conversationsByTicket = defineAdapter({
  id: "conversations.by-ticket",
  version: "0.1.0",
  description: "Full conversation thread for a ticket, with messages ordered oldest-first.",
  params: z.object({ ticketId: z.string() }),
  output: z
    .object({
      id: z.string(),
      ticketId: z.string(),
      channel: ticketChannel,
      status: ticketStatus,
      messages: z.array(
        z.object({
          id: z.string(),
          conversationId: z.string(),
          body: z.string(),
          fromAgent: z.boolean(),
          fromName: z.string(),
          channel: ticketChannel,
          createdAt: z.string(),
        }),
      ),
    })
    .nullable(),
  run: async ({ ticketId }) => db.conversations.byTicket(ticketId),
});
