import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const customerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string(),
  totalBookings: z.number().int().nonnegative(),
  lastBookingAt: z.string().nullable(),
});

export const customersList = defineAdapter({
  id: "customers.list",
  version: "0.1.0",
  description:
    "Paginated list of customers, sorted by lastBookingAt desc. Defaults: page 1, 20 per page.",
  params: z.object({
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(100).optional(),
  }),
  output: z.object({
    items: z.array(customerSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
  run: async (params) => db.customers.list(params),
});
