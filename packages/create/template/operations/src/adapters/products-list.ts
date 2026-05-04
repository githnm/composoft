import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { productSchema } from "./_shared.js";

export const productsList = defineAdapter({
  id: "products.list",
  version: "0.1.0",
  description: "Paginated product list. Optional `category` filter and free-text `search` (sku/name/description).",
  params: z.object({
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
    category: z.string().optional(),
    search: z.string().optional(),
  }),
  output: z.object({
    items: z.array(productSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
  run: async (params) => db.products.list(params),
});
