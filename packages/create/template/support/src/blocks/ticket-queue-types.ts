import { z } from "zod";
import type { AdapterOutput, BlockProps, PageStateWriter } from "@composoft/spec";
import type { ticketsList } from "../adapters/tickets-list.js";

const ticketStatus = z.enum(["new", "open", "pending", "resolved", "closed"]);
const ticketChannel = z.enum(["email", "slack", "web"]);

export const configSchema = z.object({
  defaultStatus: ticketStatus.optional(),
  defaultChannel: ticketChannel.optional(),
  pageSize: z.number().int().positive().max(100).default(50),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { tickets: AdapterOutput<typeof ticketsList> };
export type Actions = Record<string, never>;
export type Writes = { selectTicket: PageStateWriter<{ ticketId: string }> };
export type Props = BlockProps<Config, Data, Actions, Writes>;
