import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./activity-feed-types.js";
import { ActivityFeedView } from "./activity-feed.component.js";

export const activityFeedBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "crm.activity-feed",
  version: "0.1.0",
  description:
    "Chronological feed of CRM activities (calls, emails, meetings, notes, tasks). Optionally scoped to the deal currently selected on the page.",
  config: configSchema,
  data: {
    activities: {
      adapter: "activities.list",
      params: {
        dealId: { kind: "from-page-state", path: "selection.dealId" },
      },
    },
  },
  actions: {
    log: { workflow: "activities.log" },
  },
  component: ActivityFeedView,
});
