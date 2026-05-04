import { z } from "zod";
import type {
  AdapterOutput,
  BlockProps,
  WorkflowActionWithPrefilled,
} from "@composoft/spec";
import type { productsById } from "../adapters/products-by-id.js";
import type { stockLevelsByProduct } from "../adapters/stock-levels-by-product.js";
import type { stockAdjust } from "../workflows/stock-adjust.js";
import type { stockTransfer } from "../workflows/stock-transfer.js";

export const configSchema = z.object({});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  product: AdapterOutput<typeof productsById>;
  stock: AdapterOutput<typeof stockLevelsByProduct>;
};
export type Actions = {
  adjust: WorkflowActionWithPrefilled<typeof stockAdjust, "productId">;
  transfer: WorkflowActionWithPrefilled<typeof stockTransfer, "productId">;
};
export type Props = BlockProps<Config, Data, Actions>;
