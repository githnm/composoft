import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const statusSchema = z.enum(["draft", "approved", "received", "partial"]);

export const purchaseOrderById = defineAdapter({
  id: "purchase-orders.by-id",
  version: "0.1.0",
  description: "Return a single purchase order with all its line items (joined via json_agg in one round-trip).",
  params: z.object({
    poId: z.string(),
  }),
  output: z.object({
    id: z.string(),
    poNumber: z.string(),
    vendorId: z.string(),
    vendorName: z.string(),
    status: statusSchema,
    createdAt: z.string(),
    approvedAt: z.string().nullable(),
    receivedAt: z.string().nullable(),
    totalAmount: z.number(),
    currency: z.string(),
    lineItems: z.array(
      z.object({
        id: z.number().int(),
        itemId: z.string(),
        itemName: z.string(),
        itemSku: z.string(),
        quantity: z.number().int(),
        unitCost: z.number(),
      }),
    ),
  }),
  run: async ({ poId }) => {
    const po = await db.purchaseOrders.byId(poId);
    if (!po) {
      throw new Error(`purchase order ${poId} not found`);
    }
    return po;
  },
});
