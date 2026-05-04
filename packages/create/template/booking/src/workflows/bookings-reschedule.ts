import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { bookingSchema } from "../adapters/bookings-list.js";

export const bookingsReschedule = defineWorkflow({
  id: "bookings.reschedule",
  version: "0.1.0",
  description:
    "Move a booking to a new start time. End time is recomputed from the event type's duration.",
  input: z.object({
    bookingId: z.string(),
    newStartTime: z.string(),
  }),
  output: bookingSchema,
  sideEffects: ["writes to db", "sends reschedule email"],
  run: async ({ bookingId, newStartTime }) =>
    db.bookings.reschedule(bookingId, newStartTime),
});
