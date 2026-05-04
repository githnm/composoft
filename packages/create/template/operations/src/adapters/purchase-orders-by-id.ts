import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { purchaseOrderSchema } from "./_shared.js";

export const purchaseOrdersById = defineAdapter({
  id: "purchase-orders.by-id",
  version: "0.1.0",
  description: "Fetch a single purchase order by id.",
  params: z.object({
    poId: z.string(),
  }),
  output: purchaseOrderSchema.nullable(),
  run: async ({ poId }) => db.purchaseOrders.byId(poId),
});
