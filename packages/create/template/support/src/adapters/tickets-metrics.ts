import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const ticketsMetrics = defineAdapter({
  id: "tickets.metrics",
  version: "0.1.0",
  description:
    "KPI counts for the inbox dashboard: open tickets, new today, SLA at risk, avg resolution hours, and channel split.",
  params: z.object({
    // Reserved for future date-range filtering. Ignored today, but accepted
    // so block configs can be forward-compatible.
    dateRange: z.string().optional(),
  }),
  output: z.object({
    openCount: z.number().int(),
    newToday: z.number().int(),
    slaAtRisk: z.number().int(),
    avgResolutionHours: z.number(),
    byChannel: z.object({
      email: z.number().int(),
      slack: z.number().int(),
      web: z.number().int(),
    }),
  }),
  run: async () => db.tickets.metrics(),
});
