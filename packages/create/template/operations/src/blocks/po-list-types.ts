import { z } from "zod";
import type { AdapterOutput, BlockProps, PageStateWriter } from "@composoft/spec";
import type { purchaseOrdersList } from "../adapters/purchase-orders-list.js";
import type { vendorsList } from "../adapters/vendors-list.js";
import { poStatusSchema } from "../adapters/_shared.js";

export const configSchema = z.object({
  defaultStatus: poStatusSchema.optional(),
  pageSize: z.number().int().positive().max(200).default(25),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  pos: AdapterOutput<typeof purchaseOrdersList>;
  vendors: AdapterOutput<typeof vendorsList>;
};
export type Actions = Record<string, never>;
export type Writes = {
  selectedPo: PageStateWriter<string>;
};
export type Props = BlockProps<Config, Data, Actions, Writes>;
