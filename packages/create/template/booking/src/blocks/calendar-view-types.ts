import { z } from "zod";
import type { AdapterOutput, BlockProps, PageStateWriter } from "@composoft/spec";
import type { bookingsList } from "../adapters/bookings-list.js";

export const configSchema = z.object({
  defaultView: z.enum(["month", "week", "day"]).default("week"),
  defaultStatus: z
    .enum(["all", "confirmed", "cancelled", "completed"])
    .default("all"),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { bookings: AdapterOutput<typeof bookingsList> };
export type Actions = Record<string, never>;
export type Writes = {
  selectedBooking: PageStateWriter<string>;
};
export type Props = BlockProps<Config, Data, Actions, Writes>;
