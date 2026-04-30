import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./contact-card-types.js";
import { ContactCardView } from "./contact-card.component.js";

export const contactCardBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "crm.contact-card",
  version: "0.1.0",
  description:
    "Card view of contacts on the currently selected deal. Highlights the primary contact and lists the rest. Reads selection.dealId from page state.",
  config: configSchema,
  data: {
    contacts: {
      adapter: "contacts.list",
      params: {
        dealId: { kind: "from-page-state", path: "selection.dealId" },
      },
    },
  },
  actions: {},
  component: ContactCardView,
});
