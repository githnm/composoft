import { defineBlock } from "@composoft/spec";
import { z } from "zod";
import { CustomerSidebar } from "./customer-sidebar.component.js";

const SECTION = z.enum(["contactInfo", "tags", "recentTickets", "vipBadge"]);

export const configSchema = z.object({
  sections: z
    .array(SECTION)
    .min(1)
    .default(["vipBadge", "contactInfo", "tags", "recentTickets"]),
});

export const customerSidebarBlock = defineBlock({
  id: "support.customer-sidebar",
  version: "0.1.0",
  description: "Sidebar showing the active customer, with FDE-chosen sections.",
  config: configSchema,
  data: {
    customer: {
      adapter: "customers.by-id",
      params: {
        customerId: { kind: "from-context", path: "customer.id" },
      },
    },
  },
  actions: {},
  component: CustomerSidebar,
});
