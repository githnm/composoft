import { defineBlock } from "@composoft/spec";
import { z } from "zod";
import { EscalationQueue } from "./escalation-queue.component.js";

export const configSchema = z.object({
  pageSize: z.number().int().positive().max(100).default(10),
  sortBy: z.enum(["priority", "lastActivity"]).default("priority"),
});

export const escalationQueueBlock = defineBlock({
  id: "support.escalation-queue",
  version: "0.1.0",
  description:
    "List of tickets currently in the escalated/senior queue, with inline assign action.",
  config: configSchema,
  data: {
    tickets: {
      adapter: "tickets.list",
      params: {
        escalated: { kind: "static", value: true },
      },
    },
  },
  actions: {
    assign: { workflow: "tickets.assign-agent" },
  },
  component: EscalationQueue,
});
