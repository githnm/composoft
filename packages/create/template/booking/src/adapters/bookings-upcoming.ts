import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { bookingSchema } from "./bookings-list.js";

export const bookingsUpcoming = defineAdapter({
  id: "bookings.upcoming",
  version: "0.1.0",
  description:
    "Confirmed bookings starting within the next 7 days, sorted by startTime ascending.",
  params: z.object({}),
  output: z.array(bookingSchema),
  run: async () => db.bookings.upcoming(),
});
