import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const adjustStock = defineWorkflow({
  id: "inventory.adjust-stock",
  version: "0.1.0",
  description: "Apply a delta to an inventory item's quantity_on_hand and write an audit entry.",
  input: z.object({
    itemId: z.string(),
    delta: z.number().int(),
    reason: z.string().min(1),
  }),
  output: z.object({
    itemId: z.string(),
    quantityOnHand: z.number().int(),
    delta: z.number().int(),
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ itemId, delta, reason }, context) => {
    const updated = await db.inventoryItems.adjustStock(
      itemId,
      delta,
      reason,
      context.user.id,
    );
    return {
      itemId: updated.id,
      quantityOnHand: updated.quantityOnHand,
      delta,
    };
  },
});
