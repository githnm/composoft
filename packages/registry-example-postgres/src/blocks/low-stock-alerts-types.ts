import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { inventoryItemsList } from "../adapters/inventory-items-list.js";
import type { adjustStock } from "../workflows/inventory-adjust-stock.js";
import type { createPurchaseOrder } from "../workflows/purchase-orders-create.js";

export const configSchema = z.object({
  warehouseId: z.string().optional(),
  /** When creating a draft PO from a vendor group, multiply the gap (reorder − onHand) by this to get the order quantity. */
  reorderQuantityMultiplier: z.number().positive().default(2),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { items: AdapterOutput<typeof inventoryItemsList> };
export type Actions = {
  adjustStock: WorkflowAction<typeof adjustStock>;
  createPo: WorkflowAction<typeof createPurchaseOrder>;
};
export type Props = BlockProps<Config, Data, Actions>;
