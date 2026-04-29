import { z } from "zod";
import type {
  AdapterOutput,
  BlockProps,
  PageStateWriter,
  WorkflowAction,
} from "@composoft/spec";
import type { inventoryItemsList } from "../adapters/inventory-items-list.js";
import type { adjustStock } from "../workflows/inventory-adjust-stock.js";

const COLUMN = z.enum([
  "sku",
  "name",
  "category",
  "warehouse",
  "onHand",
  "reorderPoint",
  "vendor",
  "lowStock",
]);

export const configSchema = z.object({
  columns: z
    .array(COLUMN)
    .min(1)
    .default(["name", "sku", "category", "warehouse", "onHand", "reorderPoint", "vendor", "lowStock"]),
  pageSize: z.number().int().positive().max(200).default(50),
  warehouseId: z.string().optional(),
  category: z.enum(["green-coffee", "roasted", "packaging", "equipment"]).optional(),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { items: AdapterOutput<typeof inventoryItemsList> };
export type Actions = { adjustStock: WorkflowAction<typeof adjustStock> };
export type Writes = { selectedItem: PageStateWriter<string> };
export type Props = BlockProps<Config, Data, Actions, Writes>;
export type Column = Config["columns"][number];
