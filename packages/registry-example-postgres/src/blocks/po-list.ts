import { defineBlock } from "@composoft/spec";
import { configSchema } from "./po-list-types.js";
import { OpsPoList } from "./po-list.component.js";

export const opsPoListBlock = defineBlock({
  id: "ops.po-list",
  version: "0.1.0",
  description:
    "Paginated table of purchase orders, filterable by status via config.defaultStatus. Inline approve action for draft POs.",
  config: configSchema,
  data: {
    pos: {
      adapter: "purchase-orders.list",
      params: {
        status: { kind: "from-config", path: "defaultStatus" },
      },
    },
  },
  actions: {
    approve: { workflow: "purchase-orders.approve" },
  },
  component: OpsPoList,
});
