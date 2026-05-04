import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { bookingsUpcoming } from "../adapters/bookings-upcoming.js";
import type { eventTypesList } from "../adapters/event-types-list.js";
import type { bookingsCancel } from "../workflows/bookings-cancel.js";

export const configSchema = z.object({
  showNotes: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  bookings: AdapterOutput<typeof bookingsUpcoming>;
  eventTypes: AdapterOutput<typeof eventTypesList>;
};
export type Actions = {
  cancel: WorkflowAction<typeof bookingsCancel>;
};
export type Props = BlockProps<Config, Data, Actions>;
