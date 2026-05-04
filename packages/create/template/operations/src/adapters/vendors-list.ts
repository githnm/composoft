import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { vendorSchema } from "./_shared.js";

export const vendorsList = defineAdapter({
  id: "vendors.list",
  version: "0.1.0",
  description: "Paginated vendor list with optional name/code search.",
  params: z.object({
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
    search: z.string().optional(),
  }),
  output: z.object({
    items: z.array(vendorSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
  run: async (params) => db.vendors.list(params),
});
