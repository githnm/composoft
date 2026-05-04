import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { purchaseOrderSchema } from "../adapters/_shared.js";

export const purchaseOrdersCreate = defineWorkflow({
  id: "purchase-orders.create",
  version: "0.1.0",
  description: "Create a draft PO with line items. Total is computed from quantity × unitCost.",
  input: z.object({
    vendorId: z.string(),
    lines: z
      .array(
        z.object({
          productId: z.string(),
          quantity: z.number().int().positive(),
          unitCost: z.number().nonnegative(),
        }),
      )
      .min(1),
    expectedDelivery: z.string(),
    notes: z.string().optional(),
  }),
  output: purchaseOrderSchema,
  sideEffects: ["writes to purchase_orders", "writes po_lines", "writes audit_log"],
  run: async (input, context) =>
    db.purchaseOrders.create({ ...input, userId: context.user.id }),
});
