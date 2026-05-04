import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const eventTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  durationMinutes: z.number().int().positive(),
  hostId: z.string(),
  color: z.enum(["emerald", "blue", "purple", "amber", "rose", "indigo"]),
  description: z.string(),
  requiresPayment: z.boolean(),
  price: z.number().nonnegative(),
  enabled: z.boolean(),
  createdAt: z.string(),
});

export const eventTypesList = defineAdapter({
  id: "event-types.list",
  version: "0.1.0",
  description: "List event types. Optional `hostId` scopes results to one host.",
  params: z.object({
    hostId: z.string().optional(),
  }),
  output: z.array(eventTypeSchema),
  run: async (params) => db.eventTypes.list(params),
});
