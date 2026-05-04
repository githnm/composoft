import { defineBlock } from "@composoft/spec";
import { configSchema } from "./po-list-types.js";
import { PoList } from "./po-list.component.js";

export const poListBlock = defineBlock({
  id: "procurement.po-list",
  version: "0.1.0",
  description:
    "Purchase-order table with status badge and vendor name. Clicking a row writes `selection.poId` to page state. Configure `defaultStatus` to scope to a single status (e.g., 'submitted' for an approver-focused page).",
  config: configSchema,
  data: {
    pos: {
      adapter: "purchase-orders.list",
      params: {
        status: { kind: "from-config", path: "defaultStatus" },
        pageSize: { kind: "from-config", path: "pageSize" },
      },
    },
    vendors: {
      adapter: "vendors.list",
      params: {
        pageSize: { kind: "static", value: 200 },
      },
    },
  },
  actions: {},
  writes: {
    selectedPo: { kind: "page-state", path: "selection.poId" },
  },
  component: PoList,
});
