import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { bookingSchema } from "../adapters/bookings-list.js";

export const bookingsCancel = defineWorkflow({
  id: "bookings.cancel",
  version: "0.1.0",
  description: "Cancel a booking. Optional `reason` is recorded on the booking.",
  input: z.object({
    bookingId: z.string(),
    reason: z.string().optional(),
  }),
  output: bookingSchema,
  sideEffects: ["writes to db", "sends cancellation email"],
  run: async ({ bookingId, reason }) => db.bookings.cancel(bookingId, reason),
});
