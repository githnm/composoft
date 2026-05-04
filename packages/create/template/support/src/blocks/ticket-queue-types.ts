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
// The writer is bound to path `selection.ticketId` in the manifest, so the
// value it accepts is the leaf string — NOT a `{ ticketId: string }` object.
// Wrapping the value would land `{ ticketId: "tkt_001" }` AT
// `selection.ticketId`, which downstream readers (`from-page-state` →
// `selection.ticketId`) would then receive as an object instead of a
// string, blowing up the adapter's Zod parse.
export type Writes = { selectTicket: PageStateWriter<string> };
export type Props = BlockProps<Config, Data, Actions, Writes>;
