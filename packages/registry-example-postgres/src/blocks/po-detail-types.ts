import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowActionWithPrefilled } from "@composoft/spec";
import type { purchaseOrderById } from "../adapters/purchase-orders-by-id.js";
import type { approvePurchaseOrder } from "../workflows/purchase-orders-approve.js";
import type { receivePurchaseOrder } from "../workflows/purchase-orders-receive.js";

export const configSchema = z.object({
  showTimestamps: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { po: AdapterOutput<typeof purchaseOrderById> };
export type Actions = {
  approve: WorkflowActionWithPrefilled<typeof approvePurchaseOrder, "poId">;
  receive: WorkflowActionWithPrefilled<typeof receivePurchaseOrder, "poId">;
};
export type Props = BlockProps<Config, Data, Actions>;
export type PoStatus = Data["po"]["status"];
