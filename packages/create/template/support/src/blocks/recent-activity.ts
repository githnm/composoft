import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./recent-activity-types.js";
import { RecentActivityView } from "./recent-activity.component.js";

export const recentActivityBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "support.recent-activity",
  version: "0.1.0",
  description:
    "Recent ticket activity feed: latest-updated tickets across all channels. Replace with a real message feed once your registry exposes one.",
  config: configSchema,
  data: {
    recent: {
      adapter: "tickets.list",
      params: {
        pageSize: { kind: "from-config", path: "pageSize" },
      },
    },
  },
  actions: {},
  component: RecentActivityView,
});
