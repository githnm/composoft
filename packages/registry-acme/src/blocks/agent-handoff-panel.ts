import { defineBlock } from "@composoft/spec";
import { z } from "zod";
import { AgentHandoffPanel } from "./agent-handoff-panel.component.js";

export const configSchema = z.object({
  showSeniorQueueOnly: z.boolean().default(false),
  agents: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        isSenior: z.boolean(),
      }),
    )
    .min(1),
});

export const agentHandoffPanelBlock = defineBlock({
  id: "support.agent-handoff-panel",
  version: "0.1.0",
  description:
    "Inline panel for reassigning the active ticket to an agent or escalating to the senior queue.",
  config: configSchema,
  data: {},
  actions: {
    assign: {
      workflow: "tickets.assign-agent",
      params: {
        ticketId: { kind: "from-context", path: "ticket.id" },
      },
    },
    escalate: {
      workflow: "tickets.escalate",
      params: {
        ticketId: { kind: "from-context", path: "ticket.id" },
      },
    },
  },
  component: AgentHandoffPanel,
});
