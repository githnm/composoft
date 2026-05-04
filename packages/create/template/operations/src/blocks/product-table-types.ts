import { z } from "zod";
import type { AdapterOutput, BlockProps, PageStateWriter } from "@composoft/spec";
import type { productsList } from "../adapters/products-list.js";
import type { lowStockList } from "../adapters/low-stock-list.js";

export const configSchema = z.object({
  filterCategory: z.string().optional(),
  defaultSort: z.enum(["sku", "name", "category"]).default("sku"),
  pageSize: z.number().int().positive().max(200).default(25),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  products: AdapterOutput<typeof productsList>;
  lowStock: AdapterOutput<typeof lowStockList>;
};
export type Actions = Record<string, never>;
export type Writes = {
  selectedProduct: PageStateWriter<string>;
};
export type Props = BlockProps<Config, Data, Actions, Writes>;
