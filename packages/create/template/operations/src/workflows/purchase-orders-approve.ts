import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";
import { purchaseOrderSchema } from "../adapters/_shared.js";

export const purchaseOrdersApprove = defineWorkflow({
  id: "purchase-orders.approve",
  version: "0.1.0",
  description:
    "Approve a submitted PO. Records the approver and (optional) comments and updates the approval request.",
  input: z.object({
    poId: z.string(),
    comments: z.string().optional(),
  }),
  output: purchaseOrderSchema,
  sideEffects: ["writes to purchase_orders", "writes approval_request", "writes audit_log"],
  run: async (input, context) =>
    db.purchaseOrders.approve({ ...input, userId: context.user.id }),
});
