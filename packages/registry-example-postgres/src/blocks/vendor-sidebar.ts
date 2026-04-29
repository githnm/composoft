import { defineBlock } from "@composoft/spec";
import { configSchema } from "./vendor-sidebar-types.js";
import { OpsVendorSidebar } from "./vendor-sidebar.component.js";

export const opsVendorSidebarBlock = defineBlock({
  id: "ops.vendor-sidebar",
  version: "0.1.0",
  description: "Sidebar card for the active vendor — contact info, payment terms, open PO count.",
  config: configSchema,
  data: {
    vendor: {
      adapter: "vendors.by-id",
      params: {
        vendorId: { kind: "from-context", path: "vendor.id" },
      },
    },
  },
  actions: {},
  component: OpsVendorSidebar,
});
