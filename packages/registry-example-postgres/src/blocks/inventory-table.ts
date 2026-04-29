import { defineBlock } from "@composoft/spec";
import { configSchema } from "./inventory-table-types.js";
import { OpsInventoryTable } from "./inventory-table.component.js";

export const opsInventoryTableBlock = defineBlock({
  id: "ops.inventory-table",
  version: "0.1.0",
  description:
    "Paginated inventory table with low-stock highlighting. Optional warehouse and category filters from config; inline adjust-stock action per row.",
  config: configSchema,
  data: {
    items: {
      adapter: "inventory-items.list",
      params: {
        warehouseId: { kind: "from-config", path: "warehouseId" },
        category: { kind: "from-config", path: "category" },
      },
    },
  },
  actions: {
    adjustStock: { workflow: "inventory.adjust-stock" },
  },
  writes: {
    selectedItem: { kind: "page-state", path: "selection.itemId" },
  },
  component: OpsInventoryTable,
});
