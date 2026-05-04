import { defineBlock } from "@composoft/spec";
import { configSchema } from "./metrics-cards-types.js";
import { MetricsCards } from "./metrics-cards.component.js";

export const metricsCardsBlock = defineBlock({
  id: "booking.metrics-cards",
  version: "0.1.0",
  description:
    "Top-of-dashboard summary cards: bookings this month, conversion rate, no-show rate, and average lead time. Aggregations are computed client-side from bookings.list.",
  config: configSchema,
  data: {
    bookings: {
      adapter: "bookings.list",
      params: {},
    },
  },
  actions: {},
  component: MetricsCards,
});
