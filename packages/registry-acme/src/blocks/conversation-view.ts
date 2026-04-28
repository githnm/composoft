import { defineBlock } from "@composoft/spec";
import { z } from "zod";
import { ConversationView } from "./conversation-view.component.js";

export const configSchema = z.object({
  showSystemMessages: z.boolean().default(true),
  groupByDay: z.boolean().default(false),
});

export const conversationViewBlock = defineBlock({
  id: "support.conversation-view",
  version: "0.1.0",
  description:
    "Threaded message view for the active ticket, with optional system-message hiding and day grouping.",
  config: configSchema,
  data: {
    messages: {
      adapter: "conversations.by-ticket-id",
      params: {
        ticketId: { kind: "from-context", path: "ticket.id" },
      },
    },
  },
  actions: {},
  component: ConversationView,
});
