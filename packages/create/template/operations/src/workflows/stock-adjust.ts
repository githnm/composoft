import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { stockMovementSchema } from "../adapters/_shared.js";

export const stockAdjust = defineWorkflow({
  id: "stock.adjust",
  version: "0.1.0",
  description:
    "Adjust on-hand stock for a product at a location by a signed delta. Records a stock movement and an audit-log entry.",
  input: z.object({
    productId: z.string(),
    locationId: z.string(),
    quantity: z.number().int(),
    reason: z.string().min(1),
    notes: z.string().optional(),
  }),
  output: z.object({
    movement: stockMovementSchema,
    newOnHand: z.number().int().nonnegative(),
  }),
  sideEffects: ["writes to stock_levels", "writes stock_movement", "writes audit_log"],
  run: async (input, context) =>
    db.stock.adjust({ ...input, userId: context.user.id }),
});
