import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const bookingSchema = z.object({
  id: z.string(),
  eventTypeId: z.string(),
  attendeeName: z.string(),
  attendeeEmail: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  status: z.enum(["confirmed", "cancelled", "completed"]),
  notes: z.string(),
  cancelReason: z.string().nullable(),
  createdAt: z.string(),
});

export const bookingsList = defineAdapter({
  id: "bookings.list",
  version: "0.1.0",
  description:
    "List bookings. Optional filters: `eventTypeId`, `status`, and `dateRange` (ISO strings, half-open).",
  params: z.object({
    eventTypeId: z.string().optional(),
    status: z.enum(["confirmed", "cancelled", "completed"]).optional(),
    dateRange: z
      .object({
        from: z.string().optional(),
        to: z.string().optional(),
      })
      .optional(),
  }),
  output: z.array(bookingSchema),
  run: async (params) => db.bookings.list(params),
});
