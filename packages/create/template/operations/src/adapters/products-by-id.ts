import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { productSchema } from "./_shared.js";

export const productsById = defineAdapter({
  id: "products.by-id",
  version: "0.1.0",
  description: "Fetch a single product by id.",
  params: z.object({
    productId: z.string(),
  }),
  output: productSchema.nullable(),
  run: async ({ productId }) => db.products.byId(productId),
});
