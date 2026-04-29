import { defineBlock } from "@composoft/spec";
import { configSchema } from "./kpi-cards-types.js";
import { OpsKpiCards } from "./kpi-cards.component.js";

export const opsKpiCardsBlock = defineBlock({
  id: "ops.kpi-cards",
  version: "0.1.0",
  description:
    "Top-of-dashboard KPI metrics: total SKUs, items below reorder, open PO count, total open spend. Optional warehouseId filter scopes inventory metrics.",
  config: configSchema,
  data: {
    kpis: {
      adapter: "kpis.summary",
      params: {
        warehouseId: { kind: "from-config", path: "warehouseId" },
      },
    },
  },
  actions: {},
  component: OpsKpiCards,
});
