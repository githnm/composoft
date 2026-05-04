import { defineBlock } from "@composoft/spec";
import { configSchema } from "./upcoming-list-types.js";
import { UpcomingList } from "./upcoming-list.component.js";

export const upcomingListBlock = defineBlock({
  id: "booking.upcoming-list",
  version: "0.1.0",
  description:
    "List of confirmed bookings in the next 7 days. Each row shows attendee, event type, and time, and exposes a cancel action.",
  config: configSchema,
  data: {
    bookings: {
      adapter: "bookings.upcoming",
      params: {},
    },
    eventTypes: {
      adapter: "event-types.list",
      params: {},
    },
  },
  actions: {
    cancel: { workflow: "bookings.cancel" },
  },
  component: UpcomingList,
});
