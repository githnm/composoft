import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const stockLevelsByProduct = defineAdapter({
  id: "stock-levels.by-product",
  version: "0.1.0",
  description: "Per-location stock for a single product (onHand / allocated / available).",
  params: z.object({
    productId: z.string(),
  }),
  output: z.array(
    z.object({
      locationId: z.string(),
      locationName: z.string(),
      onHand: z.number().int().nonnegative(),
      allocated: z.number().int().nonnegative(),
      available: z.number().int().nonnegative(),
    }),
  ),
  run: async (params) => db.stock.byProduct(params),
});
