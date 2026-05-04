import { z } from "zod";
import type {
  AdapterOutput,
  BlockProps,
  WorkflowActionWithPrefilled,
} from "@composoft/spec";
import type { purchaseOrdersById } from "../adapters/purchase-orders-by-id.js";
import type { vendorsList } from "../adapters/vendors-list.js";
import type { purchaseOrdersApprove } from "../workflows/purchase-orders-approve.js";

export const configSchema = z.object({});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  po: AdapterOutput<typeof purchaseOrdersById>;
  vendors: AdapterOutput<typeof vendorsList>;
};
export type Actions = {
  approve: WorkflowActionWithPrefilled<typeof purchaseOrdersApprove, "poId">;
};
export type Props = BlockProps<Config, Data, Actions>;
