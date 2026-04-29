import { defineBlock } from "@composoft/spec";
import { configSchema } from "./item-detail-sidebar-types.js";
import { OpsItemDetailSidebar } from "./item-detail-sidebar.component.js";

export const opsItemDetailSidebarBlock = defineBlock({
  id: "ops.item-detail-sidebar",
  version: "0.1.0",
  description:
    "Sidebar showing details of the currently selected inventory item. Reads selection.itemId from page state; renders a placeholder when nothing is selected.",
  config: configSchema,
  data: {
    item: {
      adapter: "inventory-items.by-id",
      params: {
        itemId: { kind: "from-page-state", path: "selection.itemId" },
      },
    },
  },
  actions: {},
  component: OpsItemDetailSidebar,
});
