import { defineBlock } from "@composoft/spec";
import { configSchema } from "./calendar-view-types.js";
import { CalendarView } from "./calendar-view.component.js";

export const calendarViewBlock = defineBlock({
  id: "booking.calendar-view",
  version: "0.1.0",
  description:
    "Calendar showing bookings in month / week / day. Clicking a booking writes its id to page state at `selection.bookingId`.",
  config: configSchema,
  data: {
    bookings: {
      adapter: "bookings.list",
      params: {},
    },
  },
  actions: {},
  writes: {
    selectedBooking: { kind: "page-state", path: "selection.bookingId" },
  },
  component: CalendarView,
});
