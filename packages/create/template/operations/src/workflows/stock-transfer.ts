import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { stockMovementSchema } from "../adapters/_shared.js";

export const stockTransfer = defineWorkflow({
  id: "stock.transfer",
  version: "0.1.0",
  description:
    "Transfer stock between two locations. Writes the paired out/in stock movements and an audit-log entry.",
  input: z.object({
    productId: z.string(),
    fromLocationId: z.string(),
    toLocationId: z.string(),
    quantity: z.number().int().positive(),
    reason: z.string().min(1),
  }),
  output: z.object({
    fromMovement: stockMovementSchema,
    toMovement: stockMovementSchema,
  }),
  sideEffects: ["writes to stock_levels", "writes stock_movement (x2)", "writes audit_log"],
  run: async (input, context) =>
    db.stock.transfer({ ...input, userId: context.user.id }),
});
