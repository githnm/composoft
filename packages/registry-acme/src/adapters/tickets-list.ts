import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const statusSchema = z.enum(["open", "pending", "closed"]);
const prioritySchema = z.enum(["low", "normal", "high", "urgent"]);

/**
 * `escalated` is included in `params` even though the spec brief only listed
 * status/priority/assignedTo/customerId — the escalation-queue block needs to
 * filter to escalated tickets via a static slot param, and v1 has no other
 * way to project the result set at the data-slot boundary.
 */
export const listTickets = defineAdapter({
  id: "tickets.list",
  version: "0.1.0",
  description: "List tickets joined with customer name, VIP flag, and last-activity timestamp.",
  params: z.object({
    status: statusSchema.optional(),
    priority: prioritySchema.optional(),
    assignedTo: z.string().optional(),
    customerId: z.string().optional(),
    escalated: z.boolean().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      subject: z.string(),
      status: statusSchema,
      priority: prioritySchema,
      escalated: z.boolean(),
      assignedTo: z.string().nullable(),
      customerId: z.string(),
      customerName: z.string(),
      customerVip: z.boolean(),
      lastActivityAt: z.string(),
    }),
  ),
  run: async (params) => {
    const tickets = db.tickets.list(params);
    return tickets.map((t) => {
      const c = db.customers.byId(t.customerId);
      return {
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        escalated: t.escalated,
        assignedTo: t.assignedTo,
        customerId: t.customerId,
        customerName: c?.name ?? "Unknown",
        customerVip: c?.vip ?? false,
        lastActivityAt: t.lastActivityAt,
      };
    });
  },
});
