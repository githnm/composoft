import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const DEAL_STAGE = z.enum([
  "discovery",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
]);

export const dealsList = defineAdapter({
  id: "deals.list",
  version: "0.1.0",
  description:
    "List deals, optionally filtered by stage and/or owning rep id.",
  params: z.object({
    stage: DEAL_STAGE.optional(),
    ownerId: z.string().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      leadId: z.string().nullable(),
      stage: DEAL_STAGE,
      value: z.number(),
      ownerId: z.string().nullable(),
      closeDate: z.string(),
      createdAt: z.string(),
    }),
  ),
  run: async (params) => {
    return db.deals.list(params);
  },
});
