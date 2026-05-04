import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./po-detail-types.js";
import { PoDetail } from "./po-detail.component.js";

export const poDetailBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "procurement.po-detail",
  version: "0.1.0",
  description:
    "PO sidebar: header, vendor lookup, approve action. Reads `selection.poId` from page state.",
  config: configSchema,
  data: {
    po: {
      adapter: "purchase-orders.by-id",
      params: {
        poId: { kind: "from-page-state", path: "selection.poId" },
      },
    },
    vendors: {
      adapter: "vendors.list",
      params: {},
    },
  },
  actions: {
    approve: {
      workflow: "purchase-orders.approve",
      params: { poId: { kind: "from-page-state", path: "selection.poId" } },
    },
  },
  component: PoDetail,
});
