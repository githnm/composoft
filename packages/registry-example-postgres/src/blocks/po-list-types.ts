import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { purchaseOrdersList } from "../adapters/purchase-orders-list.js";
import type { approvePurchaseOrder } from "../workflows/purchase-orders-approve.js";

const STATUS = z.enum(["draft", "approved", "received", "partial"]);
const COLUMN = z.enum([
  "poNumber",
  "vendor",
  "status",
  "lineCount",
  "totalAmount",
  "createdAt",
]);

export const configSchema = z.object({
  defaultStatus: STATUS.optional(),
  columns: z
    .array(COLUMN)
    .min(1)
    .default(["poNumber", "vendor", "status", "lineCount", "totalAmount", "createdAt"]),
  pageSize: z.number().int().positive().max(200).default(25),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { pos: AdapterOutput<typeof purchaseOrdersList> };
export type Actions = { approve: WorkflowAction<typeof approvePurchaseOrder> };
export type Props = BlockProps<Config, Data, Actions>;
export type Column = Config["columns"][number];
export type Status = z.infer<typeof STATUS>;
