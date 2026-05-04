import { defineBlock } from "@composoft/spec";
import { configSchema, type Actions, type Data } from "./agent-workload-types.js";
import { AgentWorkloadView } from "./agent-workload.component.js";

export const agentWorkloadBlock = defineBlock<typeof configSchema, Data, Actions>({
  id: "support.agent-workload",
  version: "0.1.0",
  description:
    "Per-agent open ticket counts. Lets a lead see who's overloaded at a glance.",
  config: configSchema,
  data: {
    agents: {
      adapter: "agents.list",
      params: {
        activeOnly: { kind: "from-config", path: "activeOnly" },
      },
    },
  },
  actions: {},
  component: AgentWorkloadView,
});
