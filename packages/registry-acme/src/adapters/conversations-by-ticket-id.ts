import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const conversationsByTicketId = defineAdapter({
  id: "conversations.by-ticket-id",
  version: "0.1.0",
  description: "Return all messages for a ticket, ordered oldest-first, with author and timestamp.",
  params: z.object({
    ticketId: z.string(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      ticketId: z.string(),
      author: z.object({
        kind: z.enum(["customer", "agent", "system"]),
        id: z.string(),
        name: z.string(),
      }),
      body: z.string(),
      createdAt: z.string(),
    }),
  ),
  run: async ({ ticketId }) => {
    return db.conversations.byTicketId(ticketId).map((m) => ({
      id: m.id,
      ticketId: m.ticketId,
      author: { kind: m.author.kind, id: m.author.id, name: m.author.name },
      body: m.body,
      createdAt: m.createdAt,
    }));
  },
});
