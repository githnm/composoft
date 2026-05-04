import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./ticket-detail-types.js";
import { TicketDetailView } from "./ticket-detail.component.js";

export const ticketDetailBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "support.ticket-detail",
  version: "0.1.0",
  description:
    "Sidebar block. Reads selection.ticketId from page state and shows the ticket header, conversation thread, and a reply composer with macro picker. Actions: assign, update status, update priority, escalate, reply.",
  config: configSchema,
  data: {
    ticket: {
      adapter: "tickets.by-id",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
    conversation: {
      adapter: "conversations.by-ticket",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
    macros: {
      adapter: "macros.list",
      params: {},
    },
  },
  actions: {
    assign: {
      workflow: "tickets.assign",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
    updateStatus: {
      workflow: "tickets.update-status",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
    updatePriority: {
      workflow: "tickets.update-priority",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
    escalate: {
      workflow: "tickets.escalate",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
    reply: {
      workflow: "messages.send",
      params: {
        ticketId: { kind: "from-page-state", path: "selection.ticketId" },
      },
    },
  },
  component: TicketDetailView,
});
