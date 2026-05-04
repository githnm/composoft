import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./inv-kpi-row-types.js";
import { InventoryKpiRow } from "./inv-kpi-row.component.js";

export const inventoryKpiRowBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "inventory.kpi-row",
  version: "0.1.0",
  description:
    "Top-of-dashboard inventory KPIs: SKUs, units on hand, low/out-of-stock counts.",
  config: configSchema,
  data: {
    summary: { adapter: "stock-levels.summary", params: {} },
    lowStock: { adapter: "low-stock.list", params: {} },
  },
  actions: {},
  component: InventoryKpiRow,
});
