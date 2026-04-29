import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { kpisSummary } from "../adapters/kpis-summary.js";

const KPI = z.enum(["totalSkus", "lowStockCount", "openPoCount", "openSpend"]);

export const configSchema = z.object({
  cards: z
    .array(KPI)
    .min(1)
    .default(["totalSkus", "lowStockCount", "openPoCount", "openSpend"]),
  warehouseId: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { kpis: AdapterOutput<typeof kpisSummary> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
export type CardId = Config["cards"][number];
