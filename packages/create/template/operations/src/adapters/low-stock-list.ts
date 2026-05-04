import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const lowStockList = defineAdapter({
  id: "low-stock.list",
  version: "0.1.0",
  description:
    "Products whose summed onHand is below their reorderPoint, ordered by severity (lowest ratio first). Suggested PO quantity is reorderQuantity.",
  params: z.object({
    locationId: z.string().optional(),
  }),
  output: z.array(
    z.object({
      productId: z.string(),
      sku: z.string(),
      name: z.string(),
      category: z.string(),
      onHand: z.number().int().nonnegative(),
      reorderPoint: z.number().int().nonnegative(),
      reorderQuantity: z.number().int().nonnegative(),
      primaryVendorId: z.string(),
      unitCost: z.number().nonnegative(),
    }),
  ),
  run: async (params) => db.stock.lowStock(params),
});
