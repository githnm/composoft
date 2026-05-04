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

export const eventTypesById = defineAdapter({
  id: "event-types.by-id",
  version: "0.1.0",
  description: "Fetch a single event type by id.",
  params: z.object({
    eventTypeId: z.string(),
  }),
  output: eventTypeSchema.nullable(),
  run: async ({ eventTypeId }) => db.eventTypes.byId(eventTypeId),
});
