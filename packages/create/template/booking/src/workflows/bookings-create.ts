import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { bookingSchema } from "../adapters/bookings-list.js";

export const bookingsCreate = defineWorkflow({
  id: "bookings.create",
  version: "0.1.0",
  description:
    "Create a confirmed booking for an event type. Computes endTime from the event type's duration.",
  input: z.object({
    eventTypeId: z.string(),
    attendeeName: z.string().min(1),
    attendeeEmail: z.string().email(),
    startTime: z.string(),
    notes: z.string().optional(),
  }),
  output: bookingSchema,
  sideEffects: ["writes to db", "sends confirmation email"],
  run: async (input) => db.bookings.create(input),
});
