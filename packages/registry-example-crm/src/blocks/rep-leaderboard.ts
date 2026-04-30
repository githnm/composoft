import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./rep-leaderboard-types.js";
import { RepLeaderboardView } from "./rep-leaderboard.component.js";

export const repLeaderboardBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "crm.rep-leaderboard",
  version: "0.1.0",
  description:
    "Sales-rep leaderboard ranked by total pipeline value. Aggregates deals client-side from deals.list and reps.list.",
  config: configSchema,
  data: {
    deals: {
      adapter: "deals.list",
      params: {},
    },
    reps: {
      adapter: "reps.list",
      params: {},
    },
  },
  actions: {},
  component: RepLeaderboardView,
});
