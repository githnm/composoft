import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const receivePurchaseOrder = defineWorkflow({
  id: "purchase-orders.receive",
  version: "0.1.0",
  description:
    "Mark an approved PO received and increment on-hand stock for each line item. Writes audit entries for the PO and each stock adjustment.",
  input: z.object({
    poId: z.string(),
    partial: z.boolean().optional(),
  }),
  output: z.object({
    poId: z.string(),
    status: z.enum(["received", "partial"]),
    receivedAt: z.string(),
    itemsReceived: z.number().int(),
  }),
  sideEffects: ["writes to db", "creates audit log", "adjusts inventory stock"],
  run: async ({ poId, partial = false }, context) => {
    const po = await db.purchaseOrders.byId(poId);
    if (!po) {
      throw new Error(`purchase order ${poId} not found`);
    }
    if (po.status !== "approved" && po.status !== "partial") {
      throw new Error(
        `purchase order ${poId} cannot be received from status "${po.status}"`,
      );
    }

    for (const line of po.lineItems) {
      await db.inventoryItems.adjustStock(
        line.itemId,
        line.quantity,
        `received from ${po.poNumber}`,
        context.user.id,
      );
    }

    const newStatus = partial ? ("partial" as const) : ("received" as const);
    const updated = await db.purchaseOrders.update(poId, { status: newStatus }, context.user.id);

    return {
      poId: updated.id,
      status: newStatus,
      receivedAt: updated.receivedAt ?? new Date().toISOString(),
      itemsReceived: po.lineItems.length,
    };
  },
});
