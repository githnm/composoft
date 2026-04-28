import { defineBlock } from "@composoft/spec";
import { z } from "zod";
import { TicketListView } from "./ticket-list.component.js";

const COLUMN = z.enum([
  "subject",
  "customer",
  "status",
  "priority",
  "lastActivity",
  "vipFlag",
]);

export const configSchema = z.object({
  columns: z
    .array(COLUMN)
    .min(1)
    .default(["subject", "customer", "status", "priority", "lastActivity", "vipFlag"]),
  pageSize: z.number().int().positive().max(200).default(25),
  defaultStatus: z.enum(["open", "pending", "closed"]).optional(),
});

export const ticketListBlock = defineBlock({
  id: "support.ticket-list",
  version: "0.1.0",
  description:
    "Paginated table of tickets with per-customer column choices and inline escalate/assign actions.",
  config: configSchema,
  data: {
    tickets: {
      adapter: "tickets.list",
      params: {
        status: { kind: "from-config", path: "defaultStatus" },
      },
    },
  },
  actions: {
    escalate: { workflow: "tickets.escalate" },
    assign: { workflow: "tickets.assign-agent" },
  },
  component: TicketListView,
});
