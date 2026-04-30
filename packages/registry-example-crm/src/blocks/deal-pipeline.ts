import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data, type Writes } from "./deal-pipeline-types.js";
import { DealPipelineView } from "./deal-pipeline.component.js";

export const dealPipelineBlock = defineBlock<typeof configSchema, Data, Actions, Writes>({
  id: "crm.deal-pipeline",
  version: "0.1.0",
  description:
    "Kanban board of deals grouped by pipeline stage. Drag a card or click to select; selecting writes selectedDealId to page state for downstream blocks.",
  config: configSchema,
  data: {
    deals: {
      adapter: "deals.list",
      params: {},
    },
  },
  actions: {
    moveStage: { workflow: "deals.move-stage" },
  },
  writes: {
    selectedDealId: { kind: "page-state", path: "selection.dealId" },
  },
  component: DealPipelineView,
});
