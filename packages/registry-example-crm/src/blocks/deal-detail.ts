import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./deal-detail-types.js";
import { DealDetailView } from "./deal-detail.component.js";

export const dealDetailBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "crm.deal-detail",
  version: "0.1.0",
  description:
    "Detailed view of a single deal: header info, related contacts, and recent activity. Reads the selected deal id from page state. Pairs with the deal-pipeline block.",
  config: configSchema,
  data: {
    deal: {
      adapter: "deals.by-id",
      params: {
        id: { kind: "from-page-state", path: "selection.dealId" },
      },
    },
    contacts: {
      adapter: "contacts.list",
      params: {
        dealId: { kind: "from-page-state", path: "selection.dealId" },
      },
    },
    activities: {
      adapter: "activities.list",
      params: {
        dealId: { kind: "from-page-state", path: "selection.dealId" },
      },
    },
  },
  actions: {
    moveStage: { workflow: "deals.move-stage" },
    assignRep: { workflow: "deals.assign-rep" },
    close: { workflow: "deals.close" },
  },
  component: DealDetailView,
});
