import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowActionWithPrefilled } from "@composoft/spec";
import type { ticketsById } from "../adapters/tickets-by-id.js";
import type { conversationsByTicket } from "../adapters/conversations-by-ticket.js";
import type { macrosList } from "../adapters/macros-list.js";
import type { ticketsAssign } from "../workflows/tickets-assign.js";
import type { ticketsUpdateStatus } from "../workflows/tickets-update-status.js";
import type { ticketsUpdatePriority } from "../workflows/tickets-update-priority.js";
import type { ticketsEscalate } from "../workflows/tickets-escalate.js";
import type { messagesSend } from "../workflows/messages-send.js";

export const configSchema = z.object({
  showMacros: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  ticket: AdapterOutput<typeof ticketsById>;
  conversation: AdapterOutput<typeof conversationsByTicket>;
  macros: AdapterOutput<typeof macrosList>;
};
// Every action prefills `ticketId` from page state via the manifest. The
// caller in the component supplies only the rest of the input.
export type Actions = {
  assign: WorkflowActionWithPrefilled<typeof ticketsAssign, "ticketId">;
  updateStatus: WorkflowActionWithPrefilled<typeof ticketsUpdateStatus, "ticketId">;
  updatePriority: WorkflowActionWithPrefilled<typeof ticketsUpdatePriority, "ticketId">;
  escalate: WorkflowActionWithPrefilled<typeof ticketsEscalate, "ticketId">;
  reply: WorkflowActionWithPrefilled<typeof messagesSend, "ticketId">;
};
export type Props = BlockProps<Config, Data, Actions>;
