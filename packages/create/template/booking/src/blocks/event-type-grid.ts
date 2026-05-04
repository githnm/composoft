import { defineBlock } from "@composoft/spec";
import { configSchema } from "./event-type-grid-types.js";
import { EventTypeGrid } from "./event-type-grid.component.js";

export const eventTypeGridBlock = defineBlock({
  id: "booking.event-type-grid",
  version: "0.1.0",
  description:
    "Grid (or list) of bookable event types. Clicking a card writes the selected event type id to page state so a paired booking-flow block can pick it up.",
  config: configSchema,
  data: {
    eventTypes: {
      adapter: "event-types.list",
      params: {
        hostId: { kind: "from-config", path: "hostId" },
      },
    },
  },
  actions: {},
  writes: {
    selectedEventType: { kind: "page-state", path: "selectedEventType" },
  },
  component: EventTypeGrid,
});
