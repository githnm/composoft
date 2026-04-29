import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const statusSchema = z.enum(["draft", "approved", "received", "partial"]);

const lineItemSchema = z.object({
  id: z.number().int(),
  itemId: z.string(),
  itemName: z.string(),
  itemSku: z.string(),
  quantity: z.number().int(),
  unitCost: z.number(),
});

export const purchaseOrdersList = defineAdapter({
  id: "purchase-orders.list",
  version: "0.1.0",
  description: "List purchase orders, optionally filtered by status or vendor. Line items joined inline.",
  params: z.object({
    status: statusSchema.optional(),
    vendorId: z.string().optional(),
  }),
  output: z.array(
    z.object({
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
      lineItems: z.array(lineItemSchema),
    }),
  ),
  run: async (params) => {
    return db.purchaseOrders.list(params);
  },
});
