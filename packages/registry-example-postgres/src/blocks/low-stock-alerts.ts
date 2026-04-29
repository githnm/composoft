import { defineBlock } from "@composoft/spec";
import { configSchema } from "./low-stock-alerts-types.js";
import { OpsLowStockAlerts } from "./low-stock-alerts.component.js";

export const opsLowStockAlertsBlock = defineBlock({
  id: "ops.low-stock-alerts",
  version: "0.1.0",
  description:
    "Items at or below reorder point, grouped by vendor. One-click create-draft-PO per vendor group, plus inline adjust-stock per item.",
  config: configSchema,
  data: {
    items: {
      adapter: "inventory-items.list",
      params: {
        lowStock: { kind: "static", value: true },
        warehouseId: { kind: "from-config", path: "warehouseId" },
      },
    },
  },
  actions: {
    adjustStock: { workflow: "inventory.adjust-stock" },
    createPo: { workflow: "purchase-orders.create" },
  },
  component: OpsLowStockAlerts,
});
