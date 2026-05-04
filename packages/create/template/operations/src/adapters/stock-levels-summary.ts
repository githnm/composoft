import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { dateRangeSchema } from "./_shared.js";

export const stockLevelsSummary = defineAdapter({
  id: "stock-levels.summary",
  version: "0.1.0",
  description:
    "Inventory snapshot KPIs: distinct SKUs, units on hand, low-stock and out-of-stock product counts. Optional locationId scopes the snapshot.",
  params: z.object({
    dateRange: dateRangeSchema,
    locationId: z.string().optional(),
  }),
  output: z.object({
    totalSkus: z.number().int().nonnegative(),
    totalUnits: z.number().int().nonnegative(),
    lowStockCount: z.number().int().nonnegative(),
    outOfStockCount: z.number().int().nonnegative(),
  }),
  run: async (params) => db.stock.summary(params),
});
