import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { stockLevelsSummary } from "../adapters/stock-levels-summary.js";
import type { lowStockList } from "../adapters/low-stock-list.js";

export const configSchema = z.object({
  showValue: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  summary: AdapterOutput<typeof stockLevelsSummary>;
  lowStock: AdapterOutput<typeof lowStockList>;
};
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
