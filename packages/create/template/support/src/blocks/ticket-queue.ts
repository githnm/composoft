import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data, type Writes } from "./ticket-queue-types.js";
import { TicketQueueView } from "./ticket-queue.component.js";

export const ticketQueueBlock = defineBlock<typeof configSchema, Data, Actions, Writes>({
  id: "support.ticket-queue",
  version: "0.1.0",
  description:
    "The inbox view: ticket table sorted by status urgency + priority + age. Clicking a row writes selection.ticketId so paired sidebar blocks (ticket-detail, account-context) can react.",
  config: configSchema,
  data: {
    tickets: {
      adapter: "tickets.list",
      params: {
        status: { kind: "from-config", path: "defaultStatus" },
        channel: { kind: "from-config", path: "defaultChannel" },
        pageSize: { kind: "from-config", path: "pageSize" },
      },
    },
  },
  actions: {},
  writes: {
    selectTicket: { kind: "page-state", path: "selection.ticketId" },
  },
  component: TicketQueueView,
});
