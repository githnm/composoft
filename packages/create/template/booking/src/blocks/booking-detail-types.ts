import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowActionWithPrefilled } from "@composoft/spec";
import type { bookingsById } from "../adapters/bookings-by-id.js";
import type { eventTypesList } from "../adapters/event-types-list.js";
import type { bookingsCancel } from "../workflows/bookings-cancel.js";
import type { bookingsReschedule } from "../workflows/bookings-reschedule.js";

export const configSchema = z.object({
  showAttendeeContact: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  booking: AdapterOutput<typeof bookingsById>;
  eventTypes: AdapterOutput<typeof eventTypesList>;
};
export type Actions = {
  cancel: WorkflowActionWithPrefilled<typeof bookingsCancel, "bookingId">;
  reschedule: WorkflowActionWithPrefilled<typeof bookingsReschedule, "bookingId">;
};
export type Props = BlockProps<Config, Data, Actions>;
