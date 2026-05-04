import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { bookingSchema } from "./bookings-list.js";

export const bookingsById = defineAdapter({
  id: "bookings.by-id",
  version: "0.1.0",
  description: "Fetch a single booking by id.",
  params: z.object({
    bookingId: z.string(),
  }),
  output: bookingSchema.nullable(),
  run: async ({ bookingId }) => db.bookings.byId(bookingId),
});
