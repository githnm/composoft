import { defineBlock } from "@composoft/spec";
import { configSchema } from "./po-detail-types.js";
import { OpsPoDetail } from "./po-detail.component.js";

export const opsPoDetailBlock = defineBlock({
  id: "ops.po-detail",
  version: "0.1.0",
  description:
    "Single PO with vendor, line items, and inline approve/receive buttons. Targets the active PO from context.",
  config: configSchema,
  data: {
    po: {
      adapter: "purchase-orders.by-id",
      params: {
        poId: { kind: "from-context", path: "po.id" },
      },
    },
  },
  actions: {
    approve: {
      workflow: "purchase-orders.approve",
      params: { poId: { kind: "from-context", path: "po.id" } },
    },
    receive: {
      workflow: "purchase-orders.receive",
      params: { poId: { kind: "from-context", path: "po.id" } },
    },
  },
  component: OpsPoDetail,
});
