import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketStatus = z.enum(["new", "open", "pending", "resolved", "closed"]);
const ticketPriority = z.enum(["low", "medium", "high", "urgent"]);
const ticketChannel = z.enum(["email", "slack", "web"]);

export const ticketsById = defineAdapter({
  id: "tickets.by-id",
  version: "0.1.0",
  description: "Full ticket details by id, joined with account name. Returns null if absent.",
  params: z.object({ ticketId: z.string() }),
  output: z
    .object({
      id: z.string(),
      accountId: z.string(),
      accountName: z.string(),
      subject: z.string(),
      status: ticketStatus,
      priority: ticketPriority,
      channel: ticketChannel,
      assigneeId: z.string().nullable(),
      requesterEmail: z.string(),
      slaDueAt: z.string(),
      resolvedAt: z.string().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .nullable(),
  run: async ({ ticketId }) => db.tickets.byId(ticketId),
});
