import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { bookingsList } from "../adapters/bookings-list.js";

export const configSchema = z.object({
  showTrend: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { bookings: AdapterOutput<typeof bookingsList> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
