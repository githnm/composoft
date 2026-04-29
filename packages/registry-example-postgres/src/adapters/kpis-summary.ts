import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const kpisSummary = defineAdapter({
  id: "kpis.summary",
  version: "0.1.0",
  description:
    "Aggregate operations KPIs: total SKUs, items below reorder point, open PO count, total open spend. " +
    "Optional warehouseId scopes the inventory metrics; PO metrics are global. Single round-trip via CTE.",
  params: z.object({
    warehouseId: z.string().optional(),
  }),
  output: z.object({
    totalSkus: z.number().int(),
    lowStockCount: z.number().int(),
    openPoCount: z.number().int(),
    openSpend: z.number(),
  }),
  run: async (params) => {
    return db.kpis.summary(params);
  },
});
