import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./lead-list-types.js";
import { LeadListView } from "./lead-list.component.js";

export const leadListBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "crm.lead-list",
  version: "0.1.0",
  description:
    "Filterable table of sales leads with one-click conversion to a new deal.",
  config: configSchema,
  data: {
    leads: {
      adapter: "leads.list",
      params: {
        status: { kind: "from-config", path: "defaultStatus" },
      },
    },
  },
  actions: {
    convert: { workflow: "leads.convert" },
  },
  component: LeadListView,
});
