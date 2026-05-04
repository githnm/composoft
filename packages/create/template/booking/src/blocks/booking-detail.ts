import { defineBlock } from "@composoft/spec";
import { configSchema } from "./booking-detail-types.js";
import { BookingDetail } from "./booking-detail.component.js";

export const bookingDetailBlock = defineBlock({
  id: "booking.booking-detail",
  version: "0.1.0",
  description:
    "Detail view for a single booking. Reads `selection.bookingId` from page state. Surfaces cancel and reschedule actions.",
  config: configSchema,
  data: {
    booking: {
      adapter: "bookings.by-id",
      params: {
        bookingId: { kind: "from-page-state", path: "selection.bookingId" },
      },
    },
    eventTypes: {
      adapter: "event-types.list",
      params: {},
    },
  },
  actions: {
    cancel: {
      workflow: "bookings.cancel",
      params: {
        bookingId: { kind: "from-page-state", path: "selection.bookingId" },
      },
    },
    reschedule: {
      workflow: "bookings.reschedule",
      params: {
        bookingId: { kind: "from-page-state", path: "selection.bookingId" },
      },
    },
  },
  component: BookingDetail,
});
