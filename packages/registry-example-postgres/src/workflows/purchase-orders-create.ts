import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const createPurchaseOrder = defineWorkflow({
  id: "purchase-orders.create",
  version: "0.1.0",
  description: "Create a draft purchase order with line items.",
  input: z.object({
    vendorId: z.string(),
    lineItems: z
      .array(
        z.object({
          itemId: z.string(),
          quantity: z.number().int().positive(),
          unitCost: z.number().positive(),
        }),
      )
      .min(1),
  }),
  output: z.object({
    id: z.string(),
    poNumber: z.string(),
    status: z.literal("draft"),
    totalAmount: z.number(),
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ vendorId, lineItems }, context) => {
    const id = `po_${Date.now().toString(36)}`;
    const poNumber = `PO-${new Date().getFullYear()}-${id.slice(-6).toUpperCase()}`;
    const created = await db.purchaseOrders.create({
      id,
      poNumber,
      vendorId,
      lineItems,
      actor: context.user.id,
    });
    return {
      id: created.id,
      poNumber: created.poNumber,
      status: "draft" as const,
      totalAmount: created.totalAmount,
    };
  },
});
