import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./kpi-row-types.js";
import { KpiRowView } from "./kpi-row.component.js";

export const kpiRowBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "support.kpi-row",
  version: "0.1.0",
  description: "Top-of-dashboard KPI strip: open count, new today, SLA at risk, avg resolution hours.",
  config: configSchema,
  data: {
    metrics: { adapter: "tickets.metrics", params: {} },
  },
  actions: {},
  component: KpiRowView,
});
