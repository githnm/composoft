import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { ticketsList } from "../adapters/tickets-list.js";

export const configSchema = z.object({
  pageSize: z.number().int().positive().max(50).default(10),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { recent: AdapterOutput<typeof ticketsList> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
