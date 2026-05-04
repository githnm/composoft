import { z } from "zod";
import type { AdapterOutput, BlockProps, PageStateWriter } from "@composoft/spec";
import type { eventTypesList } from "../adapters/event-types-list.js";

export const configSchema = z.object({
  hostId: z.string().optional(),
  layout: z.enum(["grid", "list"]).default("grid"),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { eventTypes: AdapterOutput<typeof eventTypesList> };
export type Actions = Record<string, never>;
export type Writes = {
  selectedEventType: PageStateWriter<string>;
};
export type Props = BlockProps<Config, Data, Actions, Writes>;
