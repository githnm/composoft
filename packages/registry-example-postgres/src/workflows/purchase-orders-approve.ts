import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const approvePurchaseOrder = defineWorkflow({
  id: "purchase-orders.approve",
  version: "0.1.0",
  description: "Approve a draft purchase order. Stamps approved_at and writes an audit entry.",
  input: z.object({
    poId: z.string(),
  }),
  output: z.object({
    poId: z.string(),
    status: z.literal("approved"),
    approvedAt: z.string(),
  }),
  sideEffects: ["writes to db", "creates audit log"],
  run: async ({ poId }, context) => {
    const po = await db.purchaseOrders.byId(poId);
    if (!po) {
      throw new Error(`purchase order ${poId} not found`);
    }
    if (po.status !== "draft") {
      throw new Error(`purchase order ${poId} cannot be approved from status "${po.status}"`);
    }
    const updated = await db.purchaseOrders.update(
      poId,
      { status: "approved" },
      context.user.id,
    );
    return {
      poId: updated.id,
      status: "approved" as const,
      approvedAt: updated.approvedAt ?? new Date().toISOString(),
    };
  },
});
