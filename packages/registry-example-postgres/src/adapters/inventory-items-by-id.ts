import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const categorySchema = z.enum(["green-coffee", "roasted", "packaging", "equipment"]);

export const inventoryItemById = defineAdapter({
  id: "inventory-items.by-id",
  version: "0.1.0",
  description: "Return a single inventory item with recent stock adjustments.",
  params: z.object({
    itemId: z.string(),
  }),
  output: z.object({
    id: z.string(),
    sku: z.string(),
    name: z.string(),
    category: categorySchema,
    warehouseId: z.string(),
    warehouseName: z.string(),
    quantityOnHand: z.number().int(),
    reorderPoint: z.number().int(),
    unitCost: z.number(),
    vendorId: z.string(),
    vendorName: z.string(),
    recentAdjustments: z.array(
      z.object({
        id: z.number().int(),
        delta: z.number().int(),
        reason: z.string(),
        actor: z.string(),
        at: z.string(),
      }),
    ),
  }),
  run: async ({ itemId }) => {
    const item = await db.inventoryItems.byId(itemId);
    if (!item) {
      throw new Error(`inventory item ${itemId} not found`);
    }
    const adjustments = await db.inventoryItems.recentAdjustments(itemId, 10);
    return {
      ...item,
      recentAdjustments: adjustments.map((a) => ({
        id: a.id,
        delta: Number((a.details as { delta?: unknown }).delta ?? 0),
        reason: String((a.details as { reason?: unknown }).reason ?? ""),
        actor: a.actor,
        at: a.at,
      })),
    };
  },
});
