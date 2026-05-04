import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const agentRole = z.enum(["agent", "lead", "engineer"]);

export const agentsList = defineAdapter({
  id: "agents.list",
  version: "0.1.0",
  description:
    "Agents available to handle tickets. Includes per-agent open ticket count for the workload block.",
  params: z.object({
    activeOnly: z.boolean().default(true),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: agentRole,
      avatarUrl: z.string(),
      isActive: z.boolean(),
      openTicketCount: z.number().int(),
    }),
  ),
  run: async (params) => {
    const agents = db.agents.list(params);
    const counts = db.tickets.countOpenByAssignee();
    return agents.map((a) => ({ ...a, openTicketCount: counts[a.id] ?? 0 }));
  },
});
