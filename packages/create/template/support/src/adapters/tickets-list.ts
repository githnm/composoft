import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketStatus = z.enum(["new", "open", "pending", "resolved", "closed"]);
const ticketPriority = z.enum(["low", "medium", "high", "urgent"]);
const ticketChannel = z.enum(["email", "slack", "web"]);

export const ticketsList = defineAdapter({
  id: "tickets.list",
  version: "0.1.0",
  description:
    "List tickets sorted by status urgency then priority then age. Joins account name onto each row.",
  params: z.object({
    status: ticketStatus.optional(),
    priority: ticketPriority.optional(),
    channel: ticketChannel.optional(),
    assigneeId: z.string().optional(),
    accountId: z.string().optional(),
    search: z.string().optional(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(200).default(50),
  }),
  output: z.object({
    rows: z.array(
      z.object({
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
      }),
    ),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
  run: async (params) => db.tickets.list(params),
});
