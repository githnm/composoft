import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { dateRangeSchema, poStatusSchema, purchaseOrderSchema } from "./_shared.js";

export const purchaseOrdersList = defineAdapter({
  id: "purchase-orders.list",
  version: "0.1.0",
  description:
    "Paginated PO list. Optional filters: `status`, `vendorId`, `dateRange` (against orderDate).",
  params: z.object({
    status: poStatusSchema.optional(),
    vendorId: z.string().optional(),
    dateRange: dateRangeSchema,
    page: z.number().int().positive().optional(),
    pageSize: z.number().int().positive().max(200).optional(),
  }),
  output: z.object({
    items: z.array(purchaseOrderSchema),
    total: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
  }),
  run: async (params) => db.purchaseOrders.list(params),
});
